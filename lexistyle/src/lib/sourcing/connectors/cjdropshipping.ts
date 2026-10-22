/**
 * CJDropshipping 커넥터 (P0 1호) — developers.cjdropshipping.com API 2.0
 * 인증: POST /authentication/getAccessToken {email, password(=API Key)} → accessToken(15일)
 * env 미설정 시 목업 픽스처 모드로 폴백해 전체 파이프라인이 항상 동작한다.
 */
import { cjListDataSchema, parseCjPrice } from "@/lib/catalog/cj-schema";
import { cjProductPageUrl } from "@/lib/catalog/cj-url";
import { STOCK_UNKNOWN } from "@/lib/catalog/stock-alert";
import { withRetry } from "@/lib/catalog/rate-limit";
import type { RemoteProduct, SourcingOrderPayload, SupplierConnector } from "../types";
import { createHash } from "crypto";
import {
  cjPayPageUrl,
  mockStatusForRef,
  parseCjApiStatus,
  type CjMakeupBill,
  type CjRemoteOrder,
  type CjWalletSnapshot,
} from "@/lib/hq/cj-order";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";

/** CJ orderNumber 최대 길이를 지키면서 채널 주문 품목마다 항상 같은 값을 만든다. */
export function stableCjOrderNumber(channelCode: string, externalOrderRef: string): string {
  const channel = channelCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "CH";
  const ref = externalOrderRef.toUpperCase().replace(/[^A-Z0-9_-]/g, "-") || "ORDER";
  const plain = `LEXI-${channel}-${ref}`;
  if (plain.length <= 50) return plain;
  const hash = createHash("sha256").update(`${channelCode}:${externalOrderRef}`).digest("hex").slice(0, 10).toUpperCase();
  return `LEXI-${channel}-${ref.slice(0, 50 - channel.length - hash.length - 7)}-${hash}`;
}

/** 쿠팡 원발주와 겹치지 않는 샘플 미러 주문번호. */
export const stableCjSampleOrderNumber = (externalOrderRef: string) =>
  stableCjOrderNumber("coupang_sample", externalOrderRef);

export const cjConfigured = () => Boolean(process.env.CJ_API_EMAIL && process.env.CJ_API_KEY);
const configured = cjConfigured;

let cachedToken: { token: string; exp: number } | null = null;
let lastOrderApiAt = 0;
let orderApiTail: Promise<void> = Promise.resolve();

/** CJ 주문 API는 초당 2회 제한이다. 같은 인스턴스의 병렬 호출도 직렬화한다. */
async function gateOrderApi(path: string) {
  if (!path.startsWith("/shopping/order/")) return;
  let release!: () => void;
  const previous = orderApiTail;
  orderApiTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const wait = Math.max(0, 550 - (Date.now() - lastOrderApiAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastOrderApiAt = Date.now();
  release();
}

async function token(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.token;
  const res = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.CJ_API_EMAIL, password: process.env.CJ_API_KEY }),
  });
  const json = await res.json();
  if (!json?.data?.accessToken) throw new Error(`CJ auth failed: ${json?.message ?? res.status}`);
  cachedToken = { token: json.data.accessToken, exp: Date.now() + 1000 * 60 * 60 * 24 * 10 };
  return cachedToken.token;
}

async function cj(path: string, init?: RequestInit) {
  return withRetry(async () => {
    await gateOrderApi(path);
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": await token(),
        ...init?.headers,
      },
    });
    if (res.status === 429) throw new Error(`CJ 429 rate limited: ${path}`);
    const json = await res.json();
    if (json?.code && json.code !== 200) throw new Error(`CJ ${path}: ${json.message}`);
    return json?.data;
  });
}

/** CJ productImage: 실배열, 또는 JSON 배열이 문자열로 인코딩되어 오는 경우(product/query 상세) 둘 다 대응 */
function parseProductImages(raw: unknown): { url: string }[] {
  if (Array.isArray(raw)) return (raw as string[]).filter(Boolean).map((url) => ({ url }));
  if (typeof raw !== "string" || !raw) return [];
  if (raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return (parsed as string[]).filter(Boolean).map((url) => ({ url }));
    } catch {
      /* fall through to single-URL treatment */
    }
  }
  return [{ url: raw }];
}

function mapProduct(p: Record<string, unknown>, stock = STOCK_UNKNOWN): RemoteProduct {
  const images = parseProductImages(p.productImage);
  const supplierId = p.supplierId != null ? String(p.supplierId) : null;
  const supplierName = typeof p.supplierName === "string" ? p.supplierName.trim() : "";
  return {
    externalId: String(p.pid ?? p.productId ?? ""),
    url: cjProductPageUrl(p.productUrl ? String(p.productUrl) : undefined, String(p.pid ?? p.productId ?? "")),
    title: String(p.productNameEn ?? p.productName ?? "Untitled"),
    descriptionHtml: p.description ? String(p.description) : undefined,
    categoryPath: String(p.categoryName ?? "General").split(">").map((s) => s.trim()),
    price: parseCjPrice(p.sellPrice ?? p.price),
    currency: "USD",
    /** 리스트의 listedNum은 리스팅 횟수 — 창고 재고로 쓰지 않음 */
    stock,
    listedNum: p.listedNum != null ? Number(p.listedNum) : undefined,
    sellerName: supplierName || (supplierId ? `CJ supplier ${supplierId}` : "CJDropshipping"),
    sellerInfo: { supplierId, warehouse: p.sourceFrom != null ? String(p.sourceFrom) : null },
    images,
  };
}

const MOCK_VENDORS = [
  { name: "Guangzhou Apparel Studio", supplierId: "mock-apparel" },
  { name: "Yiwu Home Goods", supplierId: "mock-home" },
  { name: "Shenzhen Beauty Tools", supplierId: "mock-beauty" },
  { name: "Ningbo Outdoor Gear", supplierId: "mock-outdoor" },
  { name: "Hangzhou Knitwear", supplierId: "mock-knit" },
  { name: "Dongguan Accessories", supplierId: "mock-acc" },
] as const;

const FIXTURES: RemoteProduct[] = Array.from({ length: 120 }, (_, i) => {
  const n = i + 1;
  const cats = [
    ["Home", "Appliances"],
    ["Beauty", "Tools"],
    ["Fashion", "Accessories"],
    ["Life", "Gadgets"],
  ][n % 4]!;
  const vendor = MOCK_VENDORS[n % MOCK_VENDORS.length]!;
  return {
    externalId: `cj-${1000 + n}`,
    title: `LEXI Sample Product ${n} — ${cats[1]}`,
    categoryPath: cats,
    price: +(1.5 + (n % 40) * 0.35).toFixed(2),
    currency: "USD",
    stock: 50 + n * 3,
    images: [{ url: `https://picsum.photos/seed/cj${1000 + n}/800/800` }],
    sellerName: vendor.name,
    descriptionHtml: `<p>LEXI Sample Product ${n} — factory-direct via CJ fulfillment.</p>`,
    sellerInfo: { mock: true, supplierId: vendor.supplierId, warehouse: "CN" },
  };
});

let mockOrderSeq = 5000;
const mockPaidRefs = new Set<string>();

function parseTotal(v: unknown): number | null {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function listCjPage(q: { page: number; pageSize?: number; category?: string }) {
  const pageSize = q.pageSize ?? 20;
  if (!configured()) {
    const filtered = FIXTURES.filter((p) => !q.category || p.categoryPath.includes(q.category));
    const start = (q.page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length };
  }
  const data = await cj(
    `/product/list?pageNum=${q.page}&pageSize=${pageSize}${q.category ? `&categoryKeyword=${encodeURIComponent(q.category)}` : ""}`,
  );
  const parsed = cjListDataSchema.safeParse(data);
  const list = parsed.success ? (parsed.data.list ?? []) : ((data?.list ?? []) as Record<string, unknown>[]);
  const totalRaw = parsed.success ? parsed.data.totalRecords : data?.totalRecords;
  return { items: list.map((p) => mapProduct(p as Record<string, unknown>)), total: parseTotal(totalRaw) };
}

type CjPlacedOrder = {
  supplierOrderRef: string;
  shipmentOrderId?: string;
  orderCode?: string;
  status?: string;
};

async function placeCjOrder(
  req: SourcingOrderPayload,
  opts?: { orderNumber?: string; sampleMirror?: boolean },
): Promise<CjPlacedOrder> {
  if (!configured()) return { supplierOrderRef: `CJ-MOCK-${++mockOrderSeq}` };
  const orderNumber = opts?.orderNumber || req.store?.orderNumber || `LEXI-${Date.now()}`;
  const recoverExisting = async () => {
    const page = await listCjOrders({ pageNum: 1, pageSize: 100 }).catch(() => null);
    const existing = page?.list.find((order) => order.orderCode === orderNumber);
    return existing
      ? {
          supplierOrderRef: existing.orderId,
          shipmentOrderId: existing.shipmentOrderId,
          orderCode: existing.orderCode,
          status: existing.status,
        }
      : null;
  };
  const existing = await recoverExisting();
  if (existing) return existing;
  const vid = await resolveCjOrderVid(req);
  const countryCode = (req.shippingAddress.country || "KR").toUpperCase().slice(0, 2);
  const fromCountryCode = process.env.CJ_FROM_COUNTRY_CODE || "CN";
  const city = req.shippingAddress.city || req.shippingAddress.state || req.shippingAddress.addr1 || countryCode;
  const logisticName =
    process.env.CJ_LOGISTIC_NAME || (await cheapestCjLogistic(fromCountryCode, countryCode, vid, req.qty));
  const storeFields = cjStoreOrderFields(req);
  if (opts?.sampleMirror) delete storeFields.storeName;
  const request = {
    method: "POST",
    body: JSON.stringify({
      orderNumber,
      shippingCountryCode: countryCode,
      shippingCountry: countryCode,
      shippingProvince: req.shippingAddress.state || city,
      shippingCity: city,
      shippingAddress: req.shippingAddress.addr1 ?? "",
      shippingAddress2: req.shippingAddress.addr2 ?? "",
      shippingCustomerName: req.shippingAddress.name ?? "",
      shippingZip: req.shippingAddress.zip ?? "",
      shippingPhone: req.shippingAddress.phone ?? "",
      ...(req.shippingAddress.pccc ? { consigneeID: req.shippingAddress.pccc } : {}),
      remark: req.note ?? "",
      logisticName,
      fromCountryCode,
      ...storeFields,
      ...(opts?.sampleMirror ? { orderFlow: 1, platform: "Api" } : {}),
      payType: 3,
      products: [{ vid, quantity: req.qty, ...cjStoreLineFields(req) }],
    }),
  };
  try {
    const data = await cj(`/shopping/order/createOrderV2`, request);
    return cjCreateOrderResult(data, orderNumber);
  } catch (error) {
    const recovered = await recoverExisting();
    if (recovered) return recovered;
    throw error;
  }
}

/** 두 번째 CJ 미결제 복제본. 자동 장바구니 확정·결제에는 연결하지 않는다. */
export async function createCjSampleMirror(
  req: SourcingOrderPayload,
  orderNumber: string,
): Promise<CjPlacedOrder> {
  return placeCjOrder(
    { ...req, note: `SAMPLE MIRROR - DO NOT PAY OR FULFILL / ${req.note ?? ""}`.slice(0, 500) },
    { orderNumber, sampleMirror: true },
  );
}

export const cjConnector: SupplierConnector = {
  code: "cjdropshipping",

  async listProducts(q) {
    return (await listCjPage(q)).items;
  },

  async listCatalogPage(q) {
    return listCjPage(q);
  },

  async getProduct(externalId) {
    if (!configured()) return FIXTURES.find((p) => p.externalId === externalId) ?? null;
    const data = await cj(`/product/query?pid=${encodeURIComponent(externalId)}&features=enable_inventory`);
    if (!data) return null;
    const warehouses = warehousesFromProductDetail(data as Record<string, unknown>);
    const stock = warehouses.length
      ? warehouses.reduce((a, w) => a + w.qty, 0)
      : STOCK_UNKNOWN;
    return mapProduct(data as Record<string, unknown>, stock);
  },

  async placeOrder(req: SourcingOrderPayload) {
    return placeCjOrder(req);
  },

  async getTracking(supplierOrderRef) {
    if (!configured()) {
      return { trackingNo: `MOCKTRK${supplierOrderRef.slice(-4)}`, carrier: "CJPacket", status: "in_transit" };
    }
    const data = await cj(`/logistic/getTrackInfo?trackNumber=&orderId=${encodeURIComponent(supplierOrderRef)}`).catch(() => null);
    if (!data) return null;
    const first = Array.isArray(data) ? data[0] : data;
    return { trackingNo: first?.trackingNumber, carrier: first?.logisticName, status: first?.trackingStatus };
  },
};

/** pid → 변형 목록 (발주 옵션→vid 매핑용) */
export async function listCjVariants(pid: string): Promise<{ vid: string; name: string; key?: string; costUsd?: number }[]> {
  if (!configured()) return [];
  const data = await cj(`/product/variant/query?pid=${encodeURIComponent(pid)}`);
  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  return rows
    .filter((r) => r.vid)
    .map((r) => ({
      vid: String(r.vid),
      name: String(r.variantNameEn ?? r.variantName ?? r.variantKey ?? r.vid),
      key: r.variantKey != null ? String(r.variantKey) : undefined,
      costUsd: Number(r.variantSellPrice) || undefined,
    }));
}

/** createOrderV2 필수 logisticName — freightCalculate 최저가 물류 */
async function cheapestCjLogistic(from: string, to: string, vid: string, quantity: number): Promise<string> {
  const data = await cj(`/logistic/freightCalculate`, {
    method: "POST",
    body: JSON.stringify({ startCountryCode: from, endCountryCode: to, products: [{ vid, quantity }] }),
  });
  const rows = (Array.isArray(data) ? data : []) as { logisticName?: string; logisticPrice?: number }[];
  const best = rows
    .filter((r) => r.logisticName)
    .sort((a, b) => Number(a.logisticPrice ?? Infinity) - Number(b.logisticPrice ?? Infinity))[0];
  if (!best?.logisticName) throw new Error(`CJ 물류 없음: ${from}→${to} vid=${vid}`);
  return best.logisticName;
}

/** preferred(HQ variantId·채널 SKU) → 옵션명 순. 옵션명이 주어졌는데 다옵션 중 못 찾으면 첫 variant로 오발주하지 않고 undefined */
export function pickCjVariantId(
  variants: Record<string, unknown>[],
  hint?: string,
  ...preferred: (string | undefined)[]
): string | undefined {
  const rows = variants
    .map((v) => ({
      vid: v.vid != null ? String(v.vid) : "",
      name: String(v.variantNameEn ?? v.variantName ?? v.name ?? "").trim().toLowerCase(),
    }))
    .filter((v) => v.vid);
  if (!rows.length) return undefined;
  const pref = preferred.find((p) => p && rows.some((v) => v.vid === p));
  if (pref) return pref;
  const key = hint?.trim().toLowerCase();
  if (key) {
    const exact = rows.find((v) => v.name === key || v.vid === hint);
    if (exact) return exact.vid;
    const partial = rows.find((v) => v.name && (key.includes(v.name) || v.name.includes(key)));
    if (partial) return partial.vid;
    if (rows.length > 1) return undefined;
  }
  return rows[0]!.vid;
}

async function resolveCjOrderVid(req: SourcingOrderPayload): Promise<string> {
  if (!configured()) return req.variantId || req.externalId;
  const data = await cj(`/product/query?pid=${encodeURIComponent(req.externalId)}&features=enable_inventory`).catch(() => null);
  const variants = ((data as Record<string, unknown> | null)?.variants ??
    (data as Record<string, unknown> | null)?.productVariants ??
    []) as Record<string, unknown>[];
  const rows = Array.isArray(variants) ? variants : [];
  const vid = pickCjVariantId(rows, req.variantHint, req.variantId, req.store?.sku);
  if (vid) return vid;
  if (rows.length > 1) throw new Error(`CJ 옵션 매칭 실패 — 주문옵션 "${req.variantHint ?? ""}"에 맞는 variant 없음`);
  return req.variantId || req.externalId;
}

/** createOrderV2 스토어 필드 — storeName은 CJ API 스토어명과 일치해야 함(미설정 시 기본 API 스토어) */
export function cjStoreOrderFields(req: SourcingOrderPayload, now = Date.now()): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (process.env.CJ_STORE_NAME) out.storeName = process.env.CJ_STORE_NAME;
  const t = req.store?.orderedAt ? Date.parse(req.store.orderedAt) : NaN;
  if (Number.isFinite(t)) out.storeOrderTime = Math.floor(Math.min(t, now) / 1000);
  return out;
}

export function cjStoreLineFields(req: SourcingOrderPayload): Record<string, unknown> {
  const s = req.store;
  if (!s) return {};
  const out: Record<string, unknown> = {};
  if (s.lineItemId) out.storeLineItemId = s.lineItemId.slice(0, 125);
  if (s.productName) out.storeProductName = s.productName.slice(0, 500);
  if (s.sku) out.storeSku = s.sku.slice(0, 60);
  if (s.option) out.variantOptions = s.option.slice(0, 200);
  return out;
}

const isShipmentId = (v: unknown) => typeof v === "string" && /^SD\d+/.test(v);

/** createOrderV2 응답 — orderId(CJ 주문) / shipmentOrderId(SD…, 결제 키) 분리 */
export function cjCreateOrderResult(data: unknown, orderNumber?: string) {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const rawId = typeof data === "string" ? data : d.orderId != null ? String(d.orderId) : "";
  const shipmentOrderId =
    d.shipmentOrderId != null ? String(d.shipmentOrderId) : isShipmentId(rawId) ? rawId : undefined;
  return {
    supplierOrderRef: rawId || shipmentOrderId || "",
    shipmentOrderId,
    orderCode: d.orderNumber != null ? String(d.orderNumber) : orderNumber,
    // payType 3 생성 직후는 항상 CREATED — 응답 상태값이 enum 밖(OTHER)이어도 장바구니 확정 단계가 건너뛰어지지 않게 한다
    status: (() => {
      const parsed = parseCjApiStatus(d.orderStatus ?? "CREATED");
      return parsed === "OTHER" ? ("CREATED" as const) : parsed;
    })(),
  };
}

function mapCjOrder(row: Record<string, unknown>): CjRemoteOrder {
  const orderId = String(row.orderId ?? row.cjOrderId ?? row.orderNum ?? "");
  const shipment = [row.cjOrderCode, row.cjOrderId, row.shipmentOrderId].find(isShipmentId) as string | undefined;
  return {
    orderId,
    orderCode: row.orderNum != null ? String(row.orderNum) : undefined,
    shipmentOrderId: shipment,
    remark: row.remark ? String(row.remark) : undefined,
    status: parseCjApiStatus(row.orderStatus ?? row.status),
    productAmount: Number(row.productAmount ?? row.orderAmount) || undefined,
    postageAmount: Number(row.postageAmount) || undefined,
    orderAmount: Number(row.orderAmount) || undefined,
    trackingNo: row.trackNumber ? String(row.trackNumber) : undefined,
    logisticName: row.logisticName ? String(row.logisticName) : undefined,
    disputeId: row.disputeId ? String(row.disputeId) : undefined,
    openDispute: Boolean(row.openDispute),
    payUrl: cjPayPageUrl(orderId),
  };
}

export async function listCjOrders(opts?: {
  status?: string;
  pageNum?: number;
  pageSize?: number;
  orderIds?: string[];
  paymentDateFrom?: string;
  paymentDateTo?: string;
}): Promise<{ list: CjRemoteOrder[]; total: number }> {
  if (!configured()) {
    const ids = opts?.orderIds ?? [];
    const list = ids.map((id) => {
      const status = mockPaidRefs.has(id) ? "PENDING" as const : mockStatusForRef(id);
      return {
      orderId: id,
      orderCode: id,
      status,
      productAmount: 4.5,
      postageAmount: 3,
      trackingNo: status === "SHIPPED" || status === "DELIVERED" || status === "CLOSED"
        ? `MOCKTRK${id.slice(-4)}`
        : undefined,
      logisticName: "CJPacket",
      payUrl: cjPayPageUrl(id),
      openDispute: status === "SHIPPED",
      disputeId: status === "SHIPPED" ? `DSP-${id.slice(-6)}` : undefined,
    };
    });
    const filtered = opts?.status
      ? list.filter((o) => o.status === opts.status || (opts.status === "UNSHIPPED" && (o.status === "PENDING" || o.status === "PROCESSING")))
      : list;
    return { list: filtered, total: filtered.length };
  }
  const q = new URLSearchParams();
  q.set("pageNum", String(opts?.pageNum ?? 1));
  q.set("pageSize", String(opts?.pageSize ?? 50));
  if (opts?.status) q.set("status", opts.status);
  if (opts?.orderIds?.length) q.set("orderIds", opts.orderIds.join(","));
  if (opts?.paymentDateFrom && opts?.paymentDateTo) {
    q.set("paymentDateFrom", opts.paymentDateFrom);
    q.set("paymentDateTo", opts.paymentDateTo);
  }
  const data = await cj(`/shopping/order/list?${q.toString()}`);
  const rows = (data?.list ?? []) as Record<string, unknown>[];
  return { list: rows.map(mapCjOrder), total: Number(data?.total) || rows.length };
}

export async function getCjOrder(orderId: string): Promise<CjRemoteOrder | null> {
  if (!configured()) {
    const { list } = await listCjOrders({ orderIds: [orderId] });
    return list[0] ?? null;
  }
  const data = await cj(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`);
  if (!data) return null;
  return mapCjOrder(data as Record<string, unknown>);
}

export type CjTrackInfo = { status: string; routes: { time: string; place?: string; text: string }[] };

/** 운송장 추적 — 출고 전에는 routes가 비고 status만 Processing. 조회 실패·미등록은 null */
export async function fetchCjTrackInfo(trackNumber: string): Promise<CjTrackInfo | null> {
  if (!configured() || !trackNumber) return null;
  const data = await cj(`/logistic/trackInfo?trackNumber=${encodeURIComponent(trackNumber)}`);
  const d = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!d) return null;
  const rows = (Array.isArray(d.routes) ? d.routes : []) as Record<string, unknown>[];
  return {
    status: String(d.trackingStatus ?? ""),
    routes: rows
      .map((r) => ({
        time: String(r.acceptTime ?? ""),
        place: r.acceptAddress ? String(r.acceptAddress) : undefined,
        text: String(r.remark ?? ""),
      }))
      .filter((r) => r.text),
  };
}

export type CjCartConfirm = { shipmentsId?: string; intercepted: string[] };

/**
 * CJ 화면의 "주문 선택에 추가" → 확정과 같은 흐름. payType=3 주문(CREATED)을 장바구니에 담고 확정해 UNPAID로 만든다.
 * 키는 SD… 주문코드, 반환 shipmentsId(CJ…)가 결제 묶음 키.
 */
export async function confirmCjCart(sdOrderId: string, opts?: { inCart?: boolean }): Promise<CjCartConfirm> {
  if (!configured()) return { shipmentsId: `CJ-MOCK-${sdOrderId}`, intercepted: [] };
  const body = JSON.stringify({ cjOrderIdList: [sdOrderId] });
  if (!opts?.inCart) {
    const added = (await cj(`/shopping/order/addCart`, { method: "POST", body })) as
      | { addSuccessOrders?: string[]; interceptOrders?: unknown[] }
      | null;
    const blocked = (added?.interceptOrders ?? []).map(String);
    if (blocked.length) return { intercepted: blocked };
  }
  const done = (await cj(`/shopping/order/addCartConfirm`, { method: "POST", body })) as
    | { shipmentsId?: string; interceptOrders?: unknown[] }
    | null;
  return {
    shipmentsId: done?.shipmentsId ? String(done.shipmentsId) : undefined,
    intercepted: (done?.interceptOrders ?? []).map(String),
  };
}

/** 확정된 배송묶음(shipmentsId) → 결제용 payId */
export async function generateCjParentOrder(shipmentsId: string): Promise<{ payId?: string; orderMoney?: number }> {
  if (!configured()) return { payId: `PAY-MOCK-${shipmentsId}` };
  const data = (await cj(`/shopping/order/saveGenerateParentOrder`, {
    method: "POST",
    body: JSON.stringify({ shipmentOrderId: shipmentsId }),
  })) as { payId?: string; orderMoney?: number; interceptOrders?: unknown[] } | null;
  const blocked = (data?.interceptOrders ?? []).map(String);
  if (blocked.length) throw new Error(`CJ 결제 차단: ${blocked.join(", ")}`);
  return { payId: data?.payId ? String(data.payId) : undefined, orderMoney: data?.orderMoney };
}

export async function payCjBalance(shipmentOrderId: string, payId?: string, orderType?: number): Promise<void> {
  if (!configured()) {
    mockPaidRefs.add(shipmentOrderId);
    return;
  }
  await cj(`/shopping/pay/payBalanceV2`, {
    method: "POST",
    body: JSON.stringify({
      shipmentOrderId,
      ...(payId ? { payId } : {}),
      ...(orderType != null ? { orderType } : {}),
    }),
  });
}

export async function getCjWallet(): Promise<Pick<CjWalletSnapshot, "availableUsd" | "freezeUsd" | "mock">> {
  if (!configured()) return { availableUsd: 128.4, freezeUsd: 0, mock: true };
  const data = await cj(`/shopping/pay/getBalance`);
  return {
    availableUsd: Number(data?.amount) || 0,
    freezeUsd: Number(data?.freezeAmount) || 0,
    mock: false,
  };
}

export async function listCjMakeup(): Promise<CjMakeupBill[]> {
  if (!configured()) {
    return [{ orderCode: "BT-MOCK-DIFF", amount: 2.15, orderType: 1, reason: "Postage difference" }];
  }
  const data = await cj(`/shopping/makeup/list`, {
    method: "POST",
    body: JSON.stringify({ pageNum: 1, pageSize: 50, type: 0 }),
  }).catch(() => null);
  const content = data?.pageData?.content ?? data?.list ?? [];
  if (!Array.isArray(content)) return [];
  return (content as Record<string, unknown>[]).map((row) => ({
    orderCode: String(row.orderCode ?? row.orderId ?? ""),
    amount: Number(row.amount) || 0,
    orderType: Number(row.orderType) || undefined,
    reason: row.reason ? String(row.reason) : undefined,
  }));
}

export type CjWarehouseQty = { name: string; qty: number };

export function warehousesFromProductDetail(data: Record<string, unknown>): CjWarehouseQty[] {
  const variants = (data.variants ?? data.productVariants ?? []) as Record<string, unknown>[];
  const byWh = new Map<string, number>();
  for (const v of variants) {
    const invs = (v.inventories ?? v.inventoryList ?? []) as Record<string, unknown>[];
    if (!Array.isArray(invs)) continue;
    for (const i of invs) {
      const name = String(i.areaEn ?? i.countryCode ?? i.warehouseName ?? "WH");
      byWh.set(name, (byWh.get(name) ?? 0) + (Number(i.inventory ?? i.totalInventory) || 0));
    }
  }
  if (byWh.size) return [...byWh.entries()].map(([name, qty]) => ({ name, qty }));
  // listedNum 폴백 금지 — 리스팅 횟수를 창고 수량으로 오인함
  return [];
}

/** 상품 상세 원본 (productImage·variants[].variantImage 등) */
export type CjDisputeDraft = {
  cjOrderId: string;
  products: { lineItemId: string; cjVariantId?: string; sku?: string; quantity: number; price: number; canChoose: boolean }[];
  maxAmount?: number;
  maxProductPrice?: number;
  maxPostage?: number;
  expectOptions: string[];
  reasons: { disputeReasonId: number; reasonName: string }[];
  mock?: boolean;
};

/** 분쟁 접수 직전 단계: disputeProducts → disputeConfirmInfo. /disputes/create(공장 전송)는 호출하지 않음 */
export async function prepareCjDisputeDraft(cjOrderId: string): Promise<CjDisputeDraft> {
  if (!configured()) {
    return {
      cjOrderId,
      products: [{ lineItemId: `MOCK-${cjOrderId}`, quantity: 1, price: 21.7, canChoose: true }],
      maxAmount: 27.41, maxProductPrice: 21.7, maxPostage: 5.71,
      expectOptions: ["1", "2"],
      reasons: [{ disputeReasonId: 1, reasonName: "Unfinished Logistics Tracking (mock)" }],
      mock: true,
    };
  }
  const pd = (await cj(`/disputes/disputeProducts?orderId=${encodeURIComponent(cjOrderId)}`)) as
    | { productInfoList?: Record<string, unknown>[] }
    | Record<string, unknown>[]
    | null;
  const rows = (Array.isArray(pd) ? pd : pd?.productInfoList ?? []) as Record<string, unknown>[];
  const products = rows.map((r) => ({
    lineItemId: String(r.lineItemId ?? ""),
    cjVariantId: r.cjVariantId ? String(r.cjVariantId) : undefined,
    sku: r.sku ? String(r.sku) : undefined,
    quantity: Number(r.quantity ?? 1) || 1,
    price: Number(r.price ?? 0) || 0,
    canChoose: r.canChoose !== false,
  }));
  const chosen = products.filter((p) => p.canChoose && p.lineItemId);
  if (!chosen.length) return { cjOrderId, products, expectOptions: [], reasons: [] };
  const ci = (await cj(`/disputes/disputeConfirmInfo`, {
    method: "POST",
    body: JSON.stringify({
      orderId: cjOrderId,
      productInfoList: chosen.map((p) => ({ lineItemId: p.lineItemId, quantity: String(p.quantity), price: p.price })),
    }),
  })) as Record<string, unknown> | null;
  const reasons = ((ci?.disputeReasonList ?? []) as Record<string, unknown>[]).map((r) => ({
    disputeReasonId: Number(r.disputeReasonId),
    reasonName: String(r.reasonName ?? ""),
  }));
  return {
    cjOrderId,
    products,
    maxAmount: Number(ci?.maxAmount) || undefined,
    maxProductPrice: Number(ci?.maxProductPrice) || undefined,
    maxPostage: Number(ci?.maxPostage) || undefined,
    expectOptions: ((ci?.expectResultOptionList ?? []) as unknown[]).map(String),
    reasons,
  };
}

export async function getCjProductDetail(pid: string): Promise<Record<string, unknown> | null> {
  if (!configured()) return null;
  return (await cj(`/product/query?pid=${encodeURIComponent(pid)}`)) as Record<string, unknown> | null;
}

/** product/query 원본 응답 1회 조회 (variants·소재·무게 등 채널 콘텐츠 근거 데이터용) */
export async function fetchCjProductRaw(pid: string): Promise<Record<string, unknown> | null> {
  if (!configured()) return null;
  const data = await cj(`/product/query?pid=${encodeURIComponent(pid)}`);
  return (data as Record<string, unknown> | null) ?? null;
}

/** Export 옵션 단계 — variants + 창고 수량 */
export async function fetchCjProductOptions(pid: string): Promise<{
  options: { sku?: string; name: string; stock: number; costUsd?: number }[];
  warehouses: CjWarehouseQty[];
  rawVariants: Record<string, unknown>[];
  mock: boolean;
}> {
  if (!configured()) {
    const p = FIXTURES.find((x) => x.externalId === pid);
    const stock = p?.stock ?? 10;
    return {
      options: [
        { sku: `${pid}-A`, name: "Default / S", stock, costUsd: p?.price },
        { sku: `${pid}-B`, name: "Default / M", stock: Math.max(0, stock - 3), costUsd: p?.price },
      ],
      warehouses: [{ name: "CN", qty: stock }],
      rawVariants: [
        { vid: `${pid}-A`, variantName: "Default / S", inventory: stock, variantSellPrice: p?.price },
        { vid: `${pid}-B`, variantName: "Default / M", inventory: Math.max(0, stock - 3), variantSellPrice: p?.price },
      ],
      mock: true,
    };
  }
  const data = (await cj(`/product/query?pid=${encodeURIComponent(pid)}&features=enable_inventory`)) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    return { options: [], warehouses: [], rawVariants: [], mock: false };
  }
  const warehouses = warehousesFromProductDetail(data);
  const variants = (data.variants ?? data.productVariants ?? []) as Record<string, unknown>[];
  const options = (Array.isArray(variants) ? variants : []).slice(0, 40).map((v, i) => {
    const invs = (v.inventories ?? v.inventoryList ?? []) as Record<string, unknown>[];
    let stock = 10;
    if (Array.isArray(invs) && invs.length) {
      stock = invs.reduce((a, x) => a + (Number(x.inventory ?? x.totalInventory) || 0), 0) || 10;
    } else if (v.inventory != null || v.stock != null) {
      stock = Number(v.inventory ?? v.stock) || 10;
    }
    return {
      sku: v.vid != null ? String(v.vid) : v.sku != null ? String(v.sku) : undefined,
      name: String(v.variantNameEn ?? v.variantName ?? v.name ?? `옵션 ${i + 1}`),
      stock,
      costUsd: v.variantSellPrice != null ? Number(v.variantSellPrice) : undefined,
    };
  });
  return { options, warehouses, rawVariants: Array.isArray(variants) ? variants : [], mock: false };
}

export async function queryCjProductStock(pid: string): Promise<{
  stock: number;
  warehouses: CjWarehouseQty[];
  verified: boolean;
}> {
  if (!configured()) {
    const p = FIXTURES.find((x) => x.externalId === pid);
    const stock = p?.stock ?? 0;
    return { stock, warehouses: [{ name: "CN", qty: stock }], verified: true };
  }
  const data = (await cj(`/product/query?pid=${encodeURIComponent(pid)}&features=enable_inventory`)) as Record<
    string,
    unknown
  > | null;
  if (!data) return { stock: STOCK_UNKNOWN, warehouses: [], verified: false };
  const warehouses = warehousesFromProductDetail(data);
  if (!warehouses.length) return { stock: STOCK_UNKNOWN, warehouses: [], verified: false };
  const stock = warehouses.reduce((a, w) => a + w.qty, 0);
  return { stock, warehouses, verified: true };
}

export async function listCjPrivateInventory(): Promise<{
  items: import("@/lib/hq/cj-inventory-types").CjPrivateInventoryRow[];
  mock: boolean;
}> {
  const { stockAlertOf } = await import("@/lib/catalog/stock-alert");
  if (!configured()) {
    return { items: [], mock: true };
  }
  const data = await cj(`/shopping/privateInventory/list`, {
    method: "POST",
    body: JSON.stringify({ pageNum: 1, pageSize: 50 }),
  }).catch(() => null);
  const list = (data?.list ?? data?.content ?? data?.pageData?.content ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return { items: [], mock: false };
  const items = list.map((row) => {
    const qty = Number(row.quantity ?? row.qty ?? row.inventory ?? 0) || 0;
    return {
      sku: String(row.sku ?? row.vid ?? row.pid ?? ""),
      title: String(row.productName ?? row.productNameEn ?? row.name ?? "Untitled"),
      kind: "product" as const,
      qty,
      warehouse: String(row.warehouseName ?? row.storageName ?? row.countryCode ?? "CN"),
      valueUsd: Number(row.amount ?? row.value ?? row.sellPrice ?? 0) || 0,
      alert: stockAlertOf(qty, { stockVerified: true }),
    };
  });
  return { items, mock: false };
}
