/**
 * Cafe24 몰 → 소싱 파이프라인 브릿지 커넥터.
 *
 * 용도: 이미 Cafe24 몰에 넣어둔 상품(예: Cafe24 드랍쉬핑 앱으로 알리바바에서 가져온 것)을
 *      우리 소싱 파이프라인(supplier_products)으로 "빼오는" 다리.
 *      → 이후 컬렉션 담기 → AI 리뉴얼 → 자사몰 재게시 흐름을 그대로 탄다.
 *
 * ⚠️ 한계: 이건 "알리바바 직접 소싱"이 아니라 Cafe24에 이미 들어간 결과물을 읽어오는 것.
 *          알리바바 → Cafe24 넣는 1개씩 수동 병목은 Cafe24 앱 영역이라 여기서 못 없앤다.
 *
 * 자격증명: src/lib/cafe24/config.ts 의 CAFE24_* env (OAuth 또는 ACCESS_TOKEN).
 *          미설정 시 목업 픽스처로 폴백해 파이프라인이 항상 동작한다.
 */
import type { RemoteProduct, SupplierConnector } from "../types";
import { cafe24Configured } from "@/lib/cafe24/config";
import { cafe24Fetch } from "@/lib/cafe24/client";
import type { Cafe24Product, Cafe24ProductsResponse } from "@/lib/cafe24/types";

const configured = () => cafe24Configured();

function parsePrice(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  return Number(String(v).replace(/,/g, "")) || 0;
}

function mapProduct(p: Cafe24Product): RemoteProduct {
  const img = p.detail_image || p.list_image || p.small_image || p.tiny_image || "";
  const categoryPath = (p.category ?? [])
    .map((c) => c.category_name?.trim())
    .filter((x): x is string => Boolean(x));
  return {
    externalId: `c24-${p.product_no}`,
    title: p.product_name,
    descriptionHtml: p.summary_description ?? undefined,
    categoryPath: categoryPath.length ? categoryPath : ["Cafe24"],
    price: parsePrice(p.retail_price) || parsePrice(p.price),
    currency: "KRW", // Cafe24 몰 기준 통화(보통 KRW). 원가 스냅샷은 원본 통화로 보존.
    stock: p.sold_out === "T" ? 0 : 1, // Cafe24 목록 API는 수량 미포함 → 재고 정확값은 상세/재고 API 필요
    sellerName: p.brand_name || "Cafe24 Mall",
    sellerInfo: { via: "cafe24-mall", productNo: p.product_no, productCode: p.product_code },
    images: img ? [{ url: img }] : [],
  };
}

/* ---------- 목업 픽스처 (Cafe24 미연결 시 데모) ---------- */
const FIXTURES: RemoteProduct[] = [
  { externalId: "c24-9001", title: "[샘플] Cafe24 등록 원피스", categoryPath: ["Cafe24", "의류"], price: 32000, currency: "KRW", stock: 1, sellerName: "내 Cafe24 몰", images: [{ url: "https://picsum.photos/seed/c24a/800/800" }] },
  { externalId: "c24-9002", title: "[샘플] Cafe24 등록 가디건", categoryPath: ["Cafe24", "의류"], price: 41000, currency: "KRW", stock: 1, sellerName: "내 Cafe24 몰", images: [{ url: "https://picsum.photos/seed/c24b/800/800" }] },
  { externalId: "c24-9003", title: "[샘플] Cafe24 등록 귀걸이", categoryPath: ["Cafe24", "액세서리"], price: 12000, currency: "KRW", stock: 1, sellerName: "내 Cafe24 몰", images: [{ url: "https://picsum.photos/seed/c24c/800/800" }] },
].map((p) => ({ ...p, descriptionHtml: `<p>${p.title} — Cafe24 몰에서 읽어온 소싱 후보(목업).</p>`, sellerInfo: { via: "cafe24-mall", mock: true } }));

export const cafe24MallConnector: SupplierConnector = {
  code: "cafe24-mall",

  async listProducts({ page, pageSize = 100, category }) {
    if (!configured()) {
      return page === 1 ? FIXTURES.filter((p) => !category || p.categoryPath.includes(category)) : [];
    }
    const offset = (page - 1) * pageSize;
    const data = await cafe24Fetch<Cafe24ProductsResponse>({
      path: "/products",
      query: { limit: pageSize, offset, display: "T", selling: "T" },
    });
    const list = (data.products ?? []).map(mapProduct);
    return category ? list.filter((p) => p.categoryPath.includes(category)) : list;
  },

  async getProduct(externalId) {
    if (!configured()) return FIXTURES.find((p) => p.externalId === externalId) ?? null;
    const no = externalId.replace(/^c24-/, "");
    const data = await cafe24Fetch<Cafe24ProductsResponse>({ path: `/products/${no}` });
    return data.product ? mapProduct(data.product) : null;
  },
};
