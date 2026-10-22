/**
 * Coupang Wing Open API 어댑터 (P0 1호 채널) — 스펙 §9.2/§9.3
 * 인증: CEA HMAC-SHA256 — message = signedDate + method + path + query
 * env(COUPANG_VENDOR_ID/ACCESS_KEY/SECRET_KEY/RETURN_CENTER_CODE/OUTBOUND_SHIPPING_PLACE_CODE)
 * 미설정 시 목업 모드.
 *
 * 실계정 검증 과정에서 확인된 사항 (2026-08):
 *  - deliveryMethod: "AGENT_BUY"(구매대행)는 이 계정에서 거부됨(원인 불명 — 별도 셀러
 *    자격/신청이 필요할 수 있음). "SEQUENCIAL"(일반배송)은 정상 동작 — 우선 이걸로 운영.
 *  - displayCategoryCode/notices를 생략하는 "카테고리 자동매칭"은 판매자 사전 동의가
 *    필요하고 동의 없이는 필수 옵션·고시정보 검증에서 막힘 → 매 publish마다
 *    categorization/predict + category-related-metas로 실제 카테고리를 조회해
 *    필수 attributes/notices를 채워서 보낸다(카테고리마다 다름).
 *  - brand 필드에 Wing 미등록 브랜드명을 넣으면 "브랜드 ID 필요" 에러 — 생략.
 *  - deliveryCompanyCode는 출고지에 실제 연결된 택배사만 허용(쿠팡 파트너 캐리어
 *    프로그램 등으로 연결 필요) — 미연결 시 코드값과 무관하게 거부됨.
 *
 * 필요한 env:
 *   COUPANG_VENDOR_ID / ACCESS_KEY / SECRET_KEY
 *   COUPANG_RETURN_CENTER_CODE / RETURN_CHARGE_NAME / RETURN_ZIP_CODE / RETURN_ADDRESS / RETURN_ADDRESS_DETAIL
 *   COUPANG_OUTBOUND_SHIPPING_PLACE_CODE
 *   COUPANG_COMPANY_CONTACT_NUMBER / VENDOR_USER_ID
 *   COUPANG_DELIVERY_COMPANY_CODE (출고지에 연결된 택배사 코드, 예: HANJIN)
 *   COUPANG_RETURN_SHIPPING_FEE (반품배송비, 기본 3300)
 *   COUPANG_AGENT_DOCUMENT_URL (선택 — 해외구매대행 구비서류 공개 URL)
 *
 * IP 허용목록: Coupang Wing OpenAPI는 특정 IP만 허용하는데 Vercel은 고정 IP가 없어
 * 직접 호출이 막힐 수 있다(사업자별로 다름). COUPANG_RELAY_URL이 설정돼 있으면 고정 IP
 * 환경(scripts/coupang-relay.js — 로컬 PC/VPS)을 거쳐 요청한다. 서명은 그대로 유효
 * (HMAC이 path/query 기준이라 실제 전송 호스트와 무관) — 릴레이는 투명 프록시일 뿐이다.
 *   COUPANG_RELAY_URL (선택 — 예: https://xxxx.trycloudflare.com)
 *   COUPANG_RELAY_SECRET (릴레이 서버와 공유하는 값, RELAY_URL 설정 시 필수)
 */
import type { ChannelAdapter, PublishInput, PulledOrder } from "../types";
import { demoPulledOrder } from "../demo-order";
import type { Channel, ChannelListing, PurchaseRequest } from "@/lib/hq/types";
import { resolveCoupangDeliveryCode } from "../coupang/carrier-map";
import {
  coupangDeliveryCharge,
  coupangDeliveryCompanyCode,
  coupangFullyConfigured,
  coupangKeysConfigured,
  coupangReturnShippingFee,
} from "../coupang/constants";
import { coupangSearchTags, validateCoupangDocument } from "../coupang/listing-validation";
import {
  acknowledgeOrdersheet,
  coupangRequest,
  listAcceptOrdersheets,
  updateCoupangInvoices,
  uploadCoupangInvoices,
} from "../coupang/client";
import { CoupangInvoiceError, coupangInvoiceNumber } from "../coupang/invoice";

/** Wing 시각은 KST, 타임존 표기 없음 */
export function kstIso(raw: unknown): string {
  const v = raw == null ? "" : String(raw).trim();
  if (!v) return "";
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(v) ? v : `${v.replace(" ", "T")}+09:00`;
}

/** 주문서에 externalVendorSkuCode가 비면 등록상품의 vendorItemId → externalVendorSku(CJ vid)로 보완 */
export async function vendorItemSkuMap(sellerProductIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const id of [...new Set(sellerProductIds.filter(Boolean))]) {
    const p = (await coupangRequest(
      "GET",
      `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${id}`,
      "",
    ).catch(() => null)) as { items?: { vendorItemId?: number | string; externalVendorSku?: string }[] } | null;
    for (const it of p?.items ?? []) {
      if (it.vendorItemId && it.externalVendorSku) map.set(String(it.vendorItemId), String(it.externalVendorSku));
    }
  }
  return map;
}

const usdToKrw = (usd: number) => Math.round((usd / 0.00072) / 10) * 10;

type CategoryAttribute = {
  attributeTypeName: string;
  required: "MANDATORY" | "OPTIONAL";
  inputValues?: string[];
  dataType?: string;
  basicUnit?: string;
};
type CategoryNoticeDetail = { noticeCategoryDetailName: string; required: "MANDATORY" | "OPTIONAL" };
type CategoryNoticeGroup = { noticeCategoryName: string; noticeCategoryDetailNames: CategoryNoticeDetail[] };
type CategoryMeta = { attributes?: CategoryAttribute[]; noticeCategories?: CategoryNoticeGroup[] };

/** 상품명으로 카테고리 예측 → 해당 카테고리의 필수 옵션/고시정보 메타 조회 */
async function predictCategory(productName: string): Promise<{ categoryId: number; meta: CategoryMeta } | null> {
  const predict = (await coupangRequest("POST", "/v2/providers/openapi/apis/api/v1/categorization/predict", "", { productName })) as {
    predictedCategoryId?: number;
  };
  const categoryId = Number(predict?.predictedCategoryId);
  if (!categoryId) return null;
  const meta = (await coupangRequest(
    "GET",
    `/v2/providers/seller_api/apis/api/v1/marketplace/meta/category-related-metas/display-category-codes/${categoryId}`,
    "",
  )) as CategoryMeta;
  return { categoryId, meta };
}

/** CJ 옵션 속성(color/size/quantity) → 쿠팡 구매옵션명 */
function optionValueFor(typeName: string, attrs?: Record<string, string>): string | undefined {
  if (!attrs) return undefined;
  // 쿠팡 의류 카테고리에는 "색상계열", "상의 사이즈 계열", "빅사이즈 여부"처럼
  // 검색용 선택 속성이 다수 존재한다. 여기에 구매옵션 값을 중복 주입하면
  // "그레이 S S"처럼 옵션명이 중복되고 2단 옵션 선택 UI가 깨진다.
  if (typeName === "색상") return attrs.color || attrs.variant;
  if (typeName === "패션의류/잡화 사이즈" || typeName === "사이즈") return attrs.size;
  if (typeName === "수량") return attrs.quantity || "1개";
  return undefined;
}

/** 필수(MANDATORY) 구매옵션만 전송한다. 검색용 선택 속성은 상품 공통 메타에서 별도 관리. */
function buildAttributes(
  meta: CategoryMeta,
  attrs?: Record<string, string>,
): { attributeTypeName: string; attributeValueName: string }[] {
  return (meta.attributes ?? [])
    .filter((a) => a.required === "MANDATORY")
    .map((a) => {
      const mapped = optionValueFor(a.attributeTypeName, attrs);
      if (mapped) return { attributeTypeName: a.attributeTypeName, attributeValueName: mapped };
      // NUMBER+단위(수량 등)는 "FREE"가 거부되므로 기본 단위로 1개 채움
      if (a.dataType === "NUMBER" && a.basicUnit && a.basicUnit !== "없음") {
        return { attributeTypeName: a.attributeTypeName, attributeValueName: `1${a.basicUnit}` };
      }
      return {
        attributeTypeName: a.attributeTypeName,
        attributeValueName: a.inputValues?.[0] || (a.attributeTypeName === "사이즈" ? "단일" : "FREE"),
      };
    });
}

/** 필수 고시정보만 채움 — 의류/가방 우선, 없으면 기타 재화/첫 그룹 */
function buildNotices(
  meta: CategoryMeta,
  companyContactNumber: string,
): { noticeCategoryName: string; noticeCategoryDetailName: string; content: string }[] {
  const groups = meta.noticeCategories ?? [];
  const group =
    groups.find((g) => g.noticeCategoryName === "의류") ??
    groups.find((g) => g.noticeCategoryName === "가방") ??
    groups.find((g) => g.noticeCategoryName === "기타 재화") ??
    groups[0];
  if (!group) return [];
  return group.noticeCategoryDetailNames
    .filter((d) => d.required === "MANDATORY")
    .map((d) => ({
      noticeCategoryName: group.noticeCategoryName,
      noticeCategoryDetailName: d.noticeCategoryDetailName,
      content: d.noticeCategoryDetailName.includes("전화번호") ? companyContactNumber : "상세페이지 참조",
    }));
}

let mockSeq = 90000;

function coupangShippingPolicyHtml(deliveryCharge: number, returnShippingFee: number) {
  const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
  const policy = (process.env.COUPANG_RETURN_POLICY_TEXT || `단순변심 반품 시 왕복 배송비 ${won(deliveryCharge + returnShippingFee)}를 공제한 금액이 환불됩니다.`)
    .replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
  return `<section data-block="shipping-policy" style="margin-top:24px;padding:20px;border:1px solid #e8e4dc;background:#faf9f7;font-family:Pretendard,Arial,sans-serif;color:#1a1a1a"><h2 style="margin:0 0 12px;font-size:18px">배송·반품 안내</h2><p style="margin:6px 0;line-height:1.7">해외배송 상품이며 배송비는 ${won(deliveryCharge)}입니다.</p><p style="margin:6px 0;line-height:1.7">${policy}</p><p style="margin:6px 0;line-height:1.7">상품 하자·오배송은 판매자 부담으로 확인 후 처리합니다.</p></section>`;
}

export const coupangAdapter: ChannelAdapter = {
  code: "coupang",

  async publish({ listing, draft, options }: PublishInput) {
    if (!coupangFullyConfigured()) {
      return { externalRef: `CP-MOCK-${listing.id}-${++mockSeq}` };
    }
    const vendorId = process.env.COUPANG_VENDOR_ID!;
    const companyContactNumber = process.env.COUPANG_COMPANY_CONTACT_NUMBER!;
    const deliveryCharge = coupangDeliveryCharge();
    const returnShippingFee = coupangReturnShippingFee();

    if (!options?.length || options.some((o) => !o.sku || !Number.isInteger(o.stock) || o.stock! < 0)) {
      throw new Error("쿠팡 등록 전 실제 옵션별 SKU와 판매가능 재고를 확인해주세요.");
    }

    if (process.env.COUPANG_AGENT_DOCUMENT_URL) {
      await validateCoupangDocument(process.env.COUPANG_AGENT_DOCUMENT_URL);
    }

    const category = await predictCategory(draft.title);
    if (!category) throw new Error("쿠팡 카테고리를 확인할 수 없습니다.");
    for (const option of options) {
      const price = option.priceUsd ?? listing.sellPriceUsd;
      if (!Number.isFinite(price) || price <= 0) throw new Error("쿠팡 옵션 판매가격을 확인해주세요.");
    }
    const centers = await coupangRequest("GET", `/v2/providers/openapi/apis/api/v5/vendors/${vendorId}/returnShippingCenters`, "pageNum=1&pageSize=50") as {
      content?: Array<{ returnCenterCode: string; usable: boolean; shippingPlaceName: string; placeAddresses: Array<Record<string, string>> }>;
    };
    const center = centers.content?.find((c) => c.usable && String(c.returnCenterCode) === process.env.COUPANG_RETURN_CENTER_CODE);
    const address = center?.placeAddresses.find((a) => a.addressType === "ROADNAME") ?? center?.placeAddresses[0];
    if (!center || !address?.returnAddress || !address.returnZipCode) throw new Error("쿠팡 반품지 코드에 해당하는 사용 가능한 주소를 확인할 수 없습니다.");

    // CJ variant 1개 = 쿠팡 아이템 1개. externalVendorSku = CJ vid → 주문 시 그대로 CJ 발주 매핑
    const variants = (options ?? []).filter((o) => o.sku).slice(0, 200);
    const baseItem = (o?: NonNullable<PublishInput["options"]>[number]) => {
      const priceUsd = o?.priceUsd ?? listing.sellPriceUsd;
      return {
        itemName: (o?.name ?? draft.title).slice(0, 150),
        externalVendorSku: o?.sku,
        originalPrice: usdToKrw(Math.max(listing.retailPriceUsd ?? 0, priceUsd) * 1.15),
        salePrice: usdToKrw(priceUsd),
        maximumBuyCount: o?.stock && o.stock > 0 ? Math.min(o.stock, 99999) : 5,
        attributes: category
          ? buildAttributes(category.meta, o?.attributes)
          : [{ attributeTypeName: "수량", attributeValueName: "1개" }],
      };
    };

    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`;
    const data = (await coupangRequest("POST", path, "", {
      displayCategoryCode: category?.categoryId,
      sellerProductName: draft.title,
      vendorId,
      saleStartedAt: new Date().toISOString().slice(0, 19),
      saleEndedAt: "2099-12-31T23:59:59",
      deliveryMethod: "SEQUENCIAL", // AGENT_BUY는 이 계정에서 거부됨(상단 주석 참조)
      deliveryCompanyCode: process.env.COUPANG_DELIVERY_COMPANY_CODE,
      deliveryChargeType: deliveryCharge > 0 ? "CHARGE" : "FREE",
      deliveryCharge,
      freeShipOverAmount: 0,
      deliveryChargeOnReturn: returnShippingFee,
      remoteAreaDeliverable: "N",
      unionDeliveryType: "UNION_DELIVERY",
      returnCenterCode: process.env.COUPANG_RETURN_CENTER_CODE,
      returnChargeName: center.shippingPlaceName,
      companyContactNumber,
      returnZipCode: address.returnZipCode,
      returnAddress: address.returnAddress,
      returnAddressDetail: address.returnAddressDetail,
      returnCharge: returnShippingFee,
      outboundShippingPlaceCode: process.env.COUPANG_OUTBOUND_SHIPPING_PLACE_CODE,
      vendorUserId: process.env.COUPANG_VENDOR_USER_ID || undefined,
      requested: true,
      requiredDocuments: process.env.COUPANG_AGENT_DOCUMENT_URL
        ? [{ templateName: "인보이스영수증(해외구매대행 선택시)", vendorDocumentPath: process.env.COUPANG_AGENT_DOCUMENT_URL }]
        : undefined,
      items: (variants.length ? variants : [undefined]).map((o) => ({
          ...baseItem(o),
          maximumBuyForPerson: 0,
          maximumBuyForPersonPeriod: 1,
          outboundShippingTimeDay: 7,
          unitCount: 1,
          adultOnly: "EVERYONE",
          taxType: "TAX",
          parallelImported: "NOT_PARALLEL_IMPORTED",
          overseasPurchased: "OVERSEAS_PURCHASED", // 해외소싱 상품
          pccNeeded: true,
          emptyBarcode: true,
          emptyBarcodeReason: "상품특성상 바코드 없음(해외소싱)",
          certifications: [{ certificationType: "NOT_REQUIRED" }],
          searchTags: coupangSearchTags(draft.seoKeywords),
          images: draft.assets.map((a, i) => ({
            imageOrder: i,
            imageType: i === 0 ? "REPRESENTATION" : "DETAIL",
            vendorPath: a.url,
          })),
          contents: [{
            contentsType: "HTML",
            contentDetails: [{ content: `${draft.renderedHtml}${coupangShippingPolicyHtml(deliveryCharge, returnShippingFee)}`, detailType: "TEXT" }],
          }],
          notices: category ? buildNotices(category.meta, companyContactNumber) : undefined,
          offerCondition: "NEW",
        })),
    }));
    return { externalRef: String((data as { sellerProductId?: string })?.sellerProductId ?? data) };
  },

  async pullOrders(channel: Channel, { liveListings }: { liveListings: ChannelListing[] }): Promise<PulledOrder[]> {
    // 주문 조회에는 판매자 ID와 API 키만 필요하다. 반품지/출고지 설정은 상품 게시 전용이다.
    if (!coupangKeysConfigured()) {
      return [demoPulledOrder(channel, liveListings, {
        refPrefix: "CPORD",
        title: "쿠팡 상품페이지 주문",
        buyerName: "김구매",
        country: "KR",
        city: "서울",
        addr1: "강남구 테헤란로 1",
        zip: "06000",
        phone: "010-0000-0000",
        paid: 25900,
        currency: "KRW",
        optionLabel: "단품",
        paymentMethod: "쿠팡페이",
      })];
    }
    const data = ((await listAcceptOrdersheets()) ?? []) as Record<string, any>[];
    const missingSku = data.flatMap((o) =>
      (Array.isArray(o.orderItems) ? o.orderItems : []).filter((i: Record<string, any>) => !i.externalVendorSkuCode).map((i: Record<string, any>) => String(i.sellerProductId ?? "")),
    );
    const skuByVendorItem = missingSku.length ? await vendorItemSkuMap(missingSku) : new Map<string, string>();
    return data.flatMap((o) => {
      const items = Array.isArray(o.orderItems) && o.orderItems.length ? o.orderItems : [{}];
      const orderId = String(o.orderId ?? "");
      const shipmentBoxId = String(o.shipmentBoxId ?? items[0]?.shipmentBoxId ?? "");
      const addr1 = String(o.receiver?.addr1 ?? "");
      const parts = addr1.split(/\s+/);
      return items.map((item: Record<string, any>, index: number) => {
        const vendorItemId = String(item.vendorItemId ?? item.sellerProductItemId ?? index);
        return {
          externalOrderRef: items.length > 1 ? `${orderId}:${vendorItemId}` : orderId,
          externalListingRef: String(item.sellerProductId ?? ""),
          productTitle: String(item.sellerProductName ?? item.vendorItemName ?? ""),
          buyerName: o.receiver?.name ?? "",
          buyerPhone: o.receiver?.safeNumber ?? o.receiver?.receiverNumber,
          buyerCountry: "KR",
          shippingAddress: {
            name: o.receiver?.name ?? "", country: "KR",
            addr1, addr2: o.receiver?.addr2 ?? "",
            state: String(o.receiver?.province ?? o.receiver?.state ?? parts[0] ?? ""),
            city: String(o.receiver?.city ?? parts[1] ?? ""),
            zip: o.receiver?.postCode ?? "",
            phone: o.receiver?.safeNumber ?? o.receiver?.receiverNumber ?? "",
            pccc: o.overseaShippingInfoDto?.personalCustomsClearanceCode ?? "",
          },
          qty: Number(item.shippingCount ?? 1),
          paidAmount: Number(item.orderPrice ?? 0),
          currency: "KRW",
          optionLabel: String(item.sellerProductItemName ?? item.vendorItemName ?? "").trim() || undefined,
          paymentMethod: "쿠팡페이",
          raw: {
            shipmentBoxId,
            orderId,
            vendorItemId,
            externalVendorSku: String(item.externalVendorSkuCode || skuByVendorItem.get(vendorItemId) || ""),
            orderedAt: kstIso(o.orderedAt ?? o.paidAt),
            deliveryCompanyCode: String(o.deliveryCompanyCode ?? coupangDeliveryCompanyCode()),
          },
        };
      });
    });
  },

  async ackOrder(_channel: Channel, pr: PurchaseRequest, info: { trackingNo?: string; carrier?: string; vendorItemIds?: string[] }) {
    if (!coupangKeysConfigured()) return;
    const shipmentBoxId = pr.rawRow?.shipmentBoxId || pr.externalOrderRef;
    const orderId = pr.rawRow?.orderId || pr.externalOrderRef;
    try {
      await acknowledgeOrdersheet(orderId, shipmentBoxId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!/already|이미\s*(발주|확인|처리)|중복/i.test(message)) throw e;
    }
    // CJ 주문 생성 직후에는 발주확인만 하고, 실제 송장이 생긴 뒤 송장을 별도로 올린다.
    if (!info.trackingNo) return;
    const deliveryCompanyCode = resolveCoupangDeliveryCode({
      carrier: info.carrier,
      orderCode: pr.rawRow?.deliveryCompanyCode,
      fallback: coupangDeliveryCompanyCode(),
    });
    if (!deliveryCompanyCode) {
      throw new Error("쿠팡 택배사 코드 없음 — COUPANG_DELIVERY_COMPANY_CODE 또는 주문서 코드를 확인하세요");
    }
    const request = {
      orderId,
      shipmentBoxId,
      invoiceNumber: coupangInvoiceNumber(deliveryCompanyCode, info.trackingNo),
      deliveryCompanyCode,
      vendorItemIds: info.vendorItemIds?.length ? info.vendorItemIds : [pr.rawRow?.vendorItemId ?? ""],
    };
    try {
      await uploadCoupangInvoices(request);
    } catch (e) {
      // 이미 송장이 올라가 상품준비중이 아닌 주문은 변경 엔드포인트로 넘긴다
      if (!(e instanceof CoupangInvoiceError) || !e.codes.includes("INVALID_STATUS")) throw e;
      await updateCoupangInvoices(request);
    }
  },
};
