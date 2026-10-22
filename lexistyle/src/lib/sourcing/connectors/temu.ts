/**
 * Temu(테무) 공급처 커넥터 — 소싱 소스.
 *
 * ⚠️ 현실: Temu는 제3자용 공식 "상품 소싱 오픈 API"를 사실상 제공하지 않는다(폐쇄형 마켓).
 *   따라서 실전 소싱 경로는 (1) 상품 URL 단건 임포트, (2) 서드파티 데이터 API,
 *   (3) 약관·robots 준수 범위의 서버측 파싱 중 하나가 된다.
 *   ALIBABA/CJ 처럼 카탈로그 브라우즈 API가 열려있지 않으므로 listProducts 는 목업/보조.
 *
 * env(TEMU_APP_KEY/SECRET 또는 TEMU_PARTNER_TOKEN) 미설정 시 목업 폴백해 파이프라인 유지.
 * 스펙: docs/lexi-dropship-integration-spec.md §2 P1
 */
import type { RemoteProduct, SourcingOrderPayload, SupplierConnector } from "../types";

const configured = () =>
  Boolean(process.env.TEMU_PARTNER_TOKEN || (process.env.TEMU_APP_KEY && process.env.TEMU_APP_SECRET));

/* ---------- 목업 픽스처 ---------- */
const FIXTURES: RemoteProduct[] = [
  { externalId: "temu-3001", title: "미니 전동 휴대용 믹서기 USB충전", categoryPath: ["Home", "Kitchen"], price: 5.9, currency: "USD", stock: 800, sellerName: "Temu Seller", images: [{ url: "https://picsum.photos/seed/temu3001/800/800" }] },
  { externalId: "temu-3002", title: "LED 무선 센서 옷장등 3팩", categoryPath: ["Home", "Lighting"], price: 7.3, currency: "USD", stock: 450, sellerName: "Temu Seller", images: [{ url: "https://picsum.photos/seed/temu3002/800/800" }] },
  { externalId: "temu-3003", title: "실리콘 폴더블 물병 550ml", categoryPath: ["Outdoor", "Bottles"], price: 3.2, currency: "USD", stock: 1100, sellerName: "Temu Seller", images: [{ url: "https://picsum.photos/seed/temu3003/800/800" }] },
  { externalId: "temu-3004", title: "차량용 자석 폰거치대 360도", categoryPath: ["Auto", "Accessories"], price: 2.4, currency: "USD", stock: 2000, sellerName: "Temu Seller", images: [{ url: "https://picsum.photos/seed/temu3004/800/800" }] },
  { externalId: "temu-3005", title: "겨울 극세사 수면양말 5켤레", categoryPath: ["Fashion", "Socks"], price: 4.8, currency: "USD", stock: 600, sellerName: "Temu Seller", images: [{ url: "https://picsum.photos/seed/temu3005/800/800" }] },
].map((p) => ({
  ...p,
  url: `https://www.temu.com/goods.html?goods_id=${p.externalId.replace("temu-", "")}`,
  descriptionHtml: `<p>${p.title} — Temu 소싱 후보. AI 리뉴얼 후 게시.</p>`,
  sellerInfo: { mock: true, marketplace: "temu" },
}));

let mockOrderSeq = 7000;

export const temuConnector: SupplierConnector = {
  code: "temu",

  async listProducts({ page, category }) {
    // Temu는 공개 카탈로그 소싱 API가 없어 목업/보조 경로만 제공.
    if (!configured()) {
      return page === 1 ? FIXTURES.filter((p) => !category || p.categoryPath.includes(category)) : [];
    }
    // 서드파티 데이터 파트너 토큰이 있을 때의 진입점(계약 후 엔드포인트 확정).
    throw new Error("Temu live 소싱: 데이터 파트너 API 계약 후 구현");
  },

  async getProduct(externalId) {
    return FIXTURES.find((p) => p.externalId === externalId) ?? null;
  },

  /** Temu 상품 URL 단건 임포트 — 실전 1순위 경로 */
  async importByUrl(url: string): Promise<RemoteProduct | null> {
    const m = url.match(/goods_id=(\d+)/) ?? url.match(/(\d{6,})/);
    const idish = m?.[1] ?? url.replace(/\W+/g, "").slice(-8) ?? "manual";
    return {
      externalId: `temu-${idish}`,
      url,
      title: `Imported Temu item (${idish})`,
      categoryPath: ["Imported"],
      price: 6.5,
      currency: "USD",
      stock: 99,
      sellerName: "Temu Seller",
      sellerInfo: { via: "temu-mock", sourceUrl: url, marketplace: "temu" },
      images: [{ url: `https://picsum.photos/seed/${idish}/800/800` }],
      descriptionHtml: `<p>Imported from <a href="${url}">Temu source</a>. AI 리뉴얼 대상.</p>`,
    };
  },

  /** 발주 — Temu는 제3자 발주 API 미개방 → 수동 발주 폴백(supplierOrderRef 수기 입력) */
  async placeOrder(_req: SourcingOrderPayload) {
    return { supplierOrderRef: `TEMU-MANUAL-${++mockOrderSeq}` };
  },
};
