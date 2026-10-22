/**
 * Superbuy 대리구매 커넥터 (Phase B) — 1688/타오바오 발주 게이트웨이.
 * 오픈 API 키 발급 전에는 URL 단건 임포트 목업만 동작.
 */
import type { RemoteProduct, SourcingOrderPayload, SupplierConnector } from "../types";

const configured = () => Boolean(process.env.SUPERBUY_APP_KEY && process.env.SUPERBUY_APP_SECRET);
let mockSeq = 8000;

export const superbuyConnector: SupplierConnector = {
  code: "superbuy",

  async listProducts() {
    // Superbuy는 카탈로그 브라우즈가 아니라 URL/키워드 기반 — 목록 수집은 미지원
    return [];
  },

  async getProduct() {
    return null;
  },

  async importByUrl(url: string): Promise<RemoteProduct | null> {
    if (!configured()) {
      // 목업: URL에서 ID 유사값 추출해 데모 상품 생성
      const idish = url.replace(/\W+/g, "").slice(-8) || "manual";
      return {
        externalId: `sb-${idish}`,
        url,
        title: `Imported item (${idish})`,
        categoryPath: ["Imported"],
        price: 19.9,
        currency: "CNY",
        stock: 99,
        sellerName: "Taobao/1688 seller",
        sellerInfo: { via: "superbuy-mock", sourceUrl: url },
        images: [{ url: `https://picsum.photos/seed/${idish}/800/800` }],
        descriptionHtml: `<p>Imported via Superbuy agent from <a href="${url}">source</a>.</p>`,
      };
    }
    // 실 API: 상품 파라미터 조회 엔드포인트 호출 지점 (키 발급 후 구현 검증)
    throw new Error("Superbuy live API: pending credential validation");
  },

  async placeOrder(_req: SourcingOrderPayload) {
    if (!configured()) return { supplierOrderRef: `SB-MOCK-${++mockSeq}` };
    throw new Error("Superbuy live API: pending credential validation");
  },
};
