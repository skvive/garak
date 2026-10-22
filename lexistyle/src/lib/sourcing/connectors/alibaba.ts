/**
 * Alibaba / 1688 소싱 커넥터 — 카탈로그 브라우즈 + URL 단건 임포트.
 *
 * ⚠️ 자격증명 주의:
 *   상품 데이터는 **Alibaba.com/1688 Open Platform**의 App Key/Secret 이 필요하다.
 *   `LTAI...` 로 시작하는 **Alibaba Cloud(阿里云) AccessKey 는 인프라용이라 여기서 쓰지 않는다.**
 *   (Cloud 키는 번역/OSS/이미지검색 등 "가공" 단계 보조에만 사용 — 별도 모듈)
 *
 * 실 API 키(ALIBABA_OPEN_APP_KEY/SECRET) 발급 전에는 목업 픽스처로 폴백해
 * 소싱 콘솔 → 컬렉션 → AI 리뉴얼 → 게시 파이프라인이 항상 end-to-end 로 동작한다.
 *
 * 스펙: docs/lexi-dropship-integration-spec.md §2 P1 (SupplierConnector)
 */
import type { RemoteProduct, SourcingOrderPayload, SupplierConnector } from "../types";

/** Open Platform(마켓 상품 API) 키가 있을 때만 실 API 경로 사용. Cloud 키(LTAI)와 무관. */
const configured = () =>
  Boolean(process.env.ALIBABA_OPEN_APP_KEY && process.env.ALIBABA_OPEN_APP_SECRET);

// 실 API 엔드포인트는 발급받은 계약(Alibaba.com Distribution vs 1688 개방평대)에 따라 다르므로
// 키 확보 시점에 확정한다. 그 전까지는 아래 픽스처가 흐른다.
const BASE = process.env.ALIBABA_OPEN_BASE ?? "https://gw.open.1688.com/openapi";

/* ---------- 목업 픽스처 (Open Platform 키 발급 전 개발/데모용) ---------- */
const FIXTURES: RemoteProduct[] = [
  { externalId: "ali-2001", title: "여성 오버핏 니트 가디건 (겨울 신상)", categoryPath: ["Fashion", "Women", "Knitwear"], price: 6.8, currency: "CNY", stock: 480, sellerName: "杭州服饰厂", images: [{ url: "https://picsum.photos/seed/ali2001/800/800" }] },
  { externalId: "ali-2002", title: "미니멀 골드 링 귀걸이 세트 6종", categoryPath: ["Accessories", "Jewelry"], price: 1.2, currency: "CNY", stock: 3000, sellerName: "义乌饰品城", images: [{ url: "https://picsum.photos/seed/ali2002/800/800" }] },
  { externalId: "ali-2003", title: "스퀘어넥 슬림 원피스 (썸머)", categoryPath: ["Fashion", "Women", "Dress"], price: 9.4, currency: "CNY", stock: 260, sellerName: "广州女装档口", images: [{ url: "https://picsum.photos/seed/ali2003/800/800" }] },
  { externalId: "ali-2004", title: "레더 크로스백 미니 토트", categoryPath: ["Fashion", "Bags"], price: 12.5, currency: "CNY", stock: 190, sellerName: "广州皮具", images: [{ url: "https://picsum.photos/seed/ali2004/800/800" }] },
  { externalId: "ali-2005", title: "빈티지 체크 셔츠 오버사이즈 유니섹스", categoryPath: ["Fashion", "Unisex", "Shirts"], price: 7.1, currency: "CNY", stock: 540, sellerName: "杭州衬衫厂", images: [{ url: "https://picsum.photos/seed/ali2005/800/800" }] },
  { externalId: "ali-2006", title: "실리콘 클렌징 브러시 방수", categoryPath: ["Beauty", "Tools"], price: 2.3, currency: "CNY", stock: 1200, sellerName: "深圳美容仪厂", images: [{ url: "https://picsum.photos/seed/ali2006/800/800" }] },
  { externalId: "ali-2007", title: "캔버스 버킷햇 무지 8color", categoryPath: ["Accessories", "Hats"], price: 3.0, currency: "CNY", stock: 900, sellerName: "义乌帽子", images: [{ url: "https://picsum.photos/seed/ali2007/800/800" }] },
  { externalId: "ali-2008", title: "골지 크롭 반팔티 베이직 5color", categoryPath: ["Fashion", "Women", "Tops"], price: 4.4, currency: "CNY", stock: 760, sellerName: "广州针织", images: [{ url: "https://picsum.photos/seed/ali2008/800/800" }] },
].map((p) => ({
  ...p,
  url: `https://detail.1688.com/offer/${p.externalId.replace("ali-", "")}.html`,
  descriptionHtml: `<p>${p.title} — 공장직송(factory-direct) 소싱 후보. MOQ/옵션은 상세 참조.</p>`,
  sellerInfo: { mock: true, marketplace: "1688" },
}));

function mapProduct(p: Record<string, unknown>): RemoteProduct {
  // 실 API 응답 스키마는 계약별로 상이 → 키 확보 후 필드 매핑 확정.
  const imgs = Array.isArray(p.images)
    ? (p.images as string[]).map((url) => ({ url }))
    : p.imageUrl
      ? [{ url: String(p.imageUrl) }]
      : [];
  return {
    externalId: String(p.offerId ?? p.productId ?? p.id ?? ""),
    url: p.detailUrl ? String(p.detailUrl) : undefined,
    title: String(p.subject ?? p.title ?? "Untitled"),
    descriptionHtml: p.description ? String(p.description) : undefined,
    categoryPath: String(p.categoryName ?? "General").split(">").map((s) => s.trim()),
    price: Number(p.price ?? p.priceMin ?? 0),
    currency: String(p.currency ?? "CNY"),
    stock: Number(p.amountOnSale ?? p.stock ?? 0),
    sellerName: p.sellerNick ? String(p.sellerNick) : "1688 seller",
    sellerInfo: { marketplace: "1688", memberId: p.sellerMemberId },
    images: imgs,
  };
}

let mockOrderSeq = 6000;

export const alibabaConnector: SupplierConnector = {
  code: "alibaba",

  async listProducts({ page, pageSize = 20, category }) {
    if (!configured()) {
      return page === 1
        ? FIXTURES.filter((p) => !category || p.categoryPath.includes(category))
        : [];
    }
    // 실 API 경로 (키 발급 후 서명·엔드포인트 검증 필요)
    const res = await fetch(
      `${BASE}/param2/1/com.alibaba.product/alibaba.product.search?page=${page}&pageSize=${pageSize}${category ? `&categoryId=${encodeURIComponent(category)}` : ""}`,
      { headers: { "Content-Type": "application/json" } },
    );
    const json = await res.json();
    const list = (json?.result?.list ?? json?.data ?? []) as Record<string, unknown>[];
    return list.map(mapProduct);
  },

  async getProduct(externalId) {
    if (!configured()) return FIXTURES.find((p) => p.externalId === externalId) ?? null;
    const res = await fetch(
      `${BASE}/param2/1/com.alibaba.product/alibaba.product.get?offerId=${encodeURIComponent(externalId)}`,
    );
    const json = await res.json();
    const data = json?.result ?? json?.data;
    return data ? mapProduct(data as Record<string, unknown>) : null;
  },

  /** 알리바바/1688 상품 URL 단건 임포트 — 스펙의 "타오바오/1688 보조 경로" */
  async importByUrl(url: string): Promise<RemoteProduct | null> {
    const m = url.match(/offer\/(\d+)/) ?? url.match(/(\d{6,})/);
    const idish = m?.[1] ?? url.replace(/\W+/g, "").slice(-8) ?? "manual";
    if (!configured()) {
      return {
        externalId: `ali-${idish}`,
        url,
        title: `Imported 1688 offer (${idish})`,
        categoryPath: ["Imported"],
        price: 15.0,
        currency: "CNY",
        stock: 99,
        sellerName: "1688 seller",
        sellerInfo: { via: "alibaba-mock", sourceUrl: url, marketplace: "1688" },
        images: [{ url: `https://picsum.photos/seed/${idish}/800/800` }],
        descriptionHtml: `<p>Imported from <a href="${url}">1688 source</a>. AI 리뉴얼 대상.</p>`,
      };
    }
    return this.getProduct(`ali-${idish}`.replace("ali-", ""));
  },

  /** 발주 — Open Platform 거래 API 미계약 시 수동 발주로 폴백(supplierOrderRef 수기 입력) */
  async placeOrder(_req: SourcingOrderPayload) {
    if (!configured()) return { supplierOrderRef: `ALI-MANUAL-${++mockOrderSeq}` };
    throw new Error("Alibaba live 발주 API: 거래 권한(trade scope) 계약 후 구현");
  },
};
