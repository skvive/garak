/** 판매채널 보드 정본 — 그리드 카드. 콘텐츠 채널은 주문 원장에 넣지 않는다. */
import type { HqState } from "./store";
import { inboxStageOf } from "./inbox-types";
import { amazonAuEnvHealth } from "@/lib/channels/amazon/health";
import { shopeeEnvHealth } from "@/lib/channels/shopee/health";
import { coupangEnvHealth } from "@/lib/channels/coupang/health";

export type SalesFamily = "commerce" | "content";
export type SalesHealth = "live" | "ready" | "mock" | "off" | "paused";

export type SalesChannelDef = {
  code: string;
  label: string;
  family: SalesFamily;
  /** HQ purchase/store channel code. content 채널은 없음 */
  hqCode?: string;
  blurb: string;
  mark: string;
};

export const SALES_CHANNEL_CATALOG: SalesChannelDef[] = [
  { code: "lexi", hqCode: "lexi", label: "LEXISTYLE", family: "commerce", mark: "L", blurb: "자사몰 판매. Cafe24가 몰 엔진이다." },
  { code: "coupang", hqCode: "coupang", label: "Coupang", family: "commerce", mark: "C", blurb: "Export 판매처 · HQ에서 리스팅·주문·송장 일괄." },
  { code: "amazon_au", hqCode: "amazon_au", label: "Amazon AU", family: "commerce", mark: "A", blurb: "Export 판매처 · HQ에서 리스팅·주문 일괄." },
  { code: "shopee", hqCode: "shopee", label: "Shopee SEA", family: "commerce", mark: "P", blurb: "동남아 Export · SG 샵 리스팅·주문 일괄." },
  { code: "shopify", hqCode: "shopify", label: "Shopify", family: "commerce", mark: "S", blurb: "해외 스토어프론트 송출·주문." },
  { code: "instagram", label: "Instagram", family: "content", mark: "I", blurb: "UGC·쇼핑태그. 전환은 랜딩/자사몰." },
  { code: "tiktok", label: "TikTok", family: "content", mark: "T", blurb: "숏폼·라이브 유입. 주문 원장은 아직 없음." },
  { code: "naver", label: "Naver", family: "content", mark: "N", blurb: "스마트스토어·블로그 유입 채널." },
  { code: "youtube", label: "YouTube", family: "content", mark: "Y", blurb: "리뷰·쇼츠. 콘텐츠 송출은 스튜디오." },
];

export type SalesChannelMeta = {
  paused?: boolean;
  handle?: string;
  note?: string;
};

export type SalesChannelCard = {
  code: string;
  label: string;
  family: SalesFamily;
  hqCode?: string;
  blurb: string;
  mark: string;
  health: SalesHealth;
  healthNote: string;
  paused: boolean;
  handle?: string;
  note?: string;
  currency?: string;
  feeRate?: number;
  orders: number;
  inspect: number;
  listings: number;
  canPull: boolean;
  /** 커머스만 — 진열대기 / 판매중 / 판매중지 */
  listingStats?: { pending: number; live: number; stopped: number; note?: string };
  /** 실판매처 콘솔 URL */
  dashboardUrl?: string | null;
};

function envHealth(code: string): { health: SalesHealth; note: string } {
  if (code === "lexi") {
    const live = Boolean(process.env.CAFE24_ACCESS_TOKEN || process.env.CAFE24_FRONT_CLIENT_ID);
    return live
      ? { health: "live", note: "Cafe24 키 있음" }
      : { health: "ready", note: "자사몰 준비 · Cafe24는 목업/미연결" };
  }
  if (code === "coupang") {
    return coupangEnvHealth();
  }
  if (code === "amazon_au") {
    return amazonAuEnvHealth();
  }
  if (code === "shopee") {
    return shopeeEnvHealth();
  }
  if (code === "shopify") {
    return process.env.SHOPIFY_STORE_DOMAIN && (process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_CLIENT_ID)
      ? { health: "live", note: "Admin API 연결" }
      : { health: "mock", note: "스토어 미연결 · 목업 인입" };
  }
  return { health: "off", note: "계정 핸들 연결 전" };
}

export function emptySalesMeta(): Record<string, SalesChannelMeta> {
  return {};
}

export function ensureSalesMeta(s: HqState) {
  if (!s.salesChannelMeta) s.salesChannelMeta = emptySalesMeta();
  return s.salesChannelMeta;
}

export function listSalesChannelCards(s: HqState): SalesChannelCard[] {
  const meta = s.salesChannelMeta ?? {};
  const chByCode = new Map(s.channels.map((c) => [c.code, c]));
  return SALES_CHANNEL_CATALOG.map((def) => {
    const m = meta[def.code] ?? {};
    const hq = def.hqCode ? chByCode.get(def.hqCode) : undefined;
    const env = envHealth(def.code);
    const paused = Boolean(m.paused);
    let health: SalesHealth = paused ? "paused" : env.health;
    if (def.family === "content" && !paused) {
      health = m.handle?.trim() ? "ready" : "off";
    }
    const prs = hq ? s.purchaseRequests.filter((p) => p.channelId === hq.id) : [];
    const inspect = prs.filter((p) => inboxStageOf(p) === "inspect").length;
    const listings = hq ? s.channelListings.filter((l) => l.channelId === hq.id).length : 0;
    return {
      ...def,
      health,
      healthNote: paused ? "일시정지 · 인입 안 함" : def.family === "content"
        ? (m.handle?.trim() ? `@${m.handle.replace(/^@/, "")}` : env.note)
        : env.note,
      paused,
      handle: m.handle,
      note: m.note,
      currency: hq?.config.currency,
      feeRate: hq?.config.feeRate,
      orders: prs.length,
      inspect,
      listings,
      canPull: Boolean(def.hqCode) && !paused,
    };
  });
}

export function salesChannelKpis(cards: SalesChannelCard[]) {
  return {
    commerce: cards.filter((c) => c.family === "commerce").length,
    content: cards.filter((c) => c.family === "content").length,
    live: cards.filter((c) => c.health === "live" || c.health === "ready").length,
    mock: cards.filter((c) => c.health === "mock").length,
    off: cards.filter((c) => c.health === "off").length,
    paused: cards.filter((c) => c.paused).length,
    openOrders: cards.reduce((n, c) => n + c.orders, 0),
    inspect: cards.reduce((n, c) => n + c.inspect, 0),
  };
}
