import { randomBytes } from "node:crypto";
import { absoluteUrl } from "@/lib/site-url";
import type { HqState } from "./store";
import type { SourcingOrder } from "./types";

export type TrackRoute = { time: string; place?: string; text: string };
export type TrackSnapshot = { status: string; routes: TrackRoute[]; fetchedAt: string; deliveredAt?: string };

export const TRACK_STAGES = ["결제 완료", "상품 준비", "출고", "해외 이동", "배달 중", "배송 완료"] as const;
const EXPIRE_MS = 90 * 86_400_000;

export const newTrackToken = () => randomBytes(16).toString("base64url");

export function trackTokenOf(so: Pick<SourcingOrder, "orderPayload">): string | undefined {
  const t = so.orderPayload?.publicTrackToken;
  return typeof t === "string" && t.length >= 16 ? t : undefined;
}

export function ensureTrackToken(so: SourcingOrder): string {
  const current = trackTokenOf(so);
  if (current) return current;
  const token = newTrackToken();
  so.orderPayload = { ...(so.orderPayload ?? {}), publicTrackToken: token };
  return token;
}

export const publicTrackPath = (token: string) => `/ko/track/${token}`;
export const publicTrackUrl = (token: string) => absoluteUrl(publicTrackPath(token));

export function trackSnapshotOf(so: Pick<SourcingOrder, "orderPayload">): TrackSnapshot | undefined {
  const s = so.orderPayload?.trackSnapshot as TrackSnapshot | undefined;
  return s && typeof s === "object" && Array.isArray(s.routes) ? s : undefined;
}

/** CJ 추적 상태(영문) → 고객 6단계. 소싱발주 상태는 추적 정보가 없을 때의 보조 */
export function trackStage(trackingStatus: string | undefined, soStatus: string): { index: number; warn: boolean } {
  const s = (trackingStatus ?? "").toLowerCase();
  if (s.includes("unsuccessful") || s.includes("exception")) return { index: 4, warn: true };
  if (s.includes("out for delivery") || s.includes("available for pickup")) return { index: 4, warn: false };
  if (/\bdelivered\b|completed|signed/.test(s)) return { index: 5, warn: false };
  if (s.includes("arrived") || s.includes("en route") || s.includes("transit")) return { index: 3, warn: false };
  if (s.includes("dispatched") || s.includes("shipped")) return { index: 2, warn: false };
  if (soStatus === "delivered" || soStatus === "settled") return { index: 5, warn: false };
  if (soStatus === "shipped") return { index: 2, warn: false };
  return { index: 1, warn: false };
}

const REMARK_KO: [RegExp, string][] = [
  [/label created/i, "송장이 생성되어 창고에서 상품을 준비하고 있습니다"],
  [/shipped to carrier/i, "운송사에 인계되었습니다"],
  [/airline reception/i, "항공사에 접수되었습니다"],
  [/airline departure/i, "항공기가 출발했습니다"],
  [/aircraft inbound/i, "항공기가 환승지에 도착했습니다"],
  [/arrive at the mail processing center/i, "우편 처리센터에 도착했습니다"],
  [/arrive at the destination/i, "도착 국가에 도착했습니다"],
  [/customs/i, "통관을 진행하고 있습니다"],
  [/out for delivery/i, "배달이 시작되었습니다"],
  [/delivered/i, "배송이 완료되었습니다"],
];

/** 고객 노출용 문구 — 한국어 매핑, 없으면 원문(공급사 표기는 LEXI로 치환) */
export function customerText(remark: string): string {
  const hit = REMARK_KO.find(([re]) => re.test(remark));
  return hit ? hit[1] : remark.replace(/\bCJ(\s*(dropshipping|packet|logistics))?\b/gi, "LEXI").trim();
}

/** 공급사 물류명(CJPacket 등)은 고객에게 노출하지 않는다 */
export function customerCarrier(name?: string): string {
  if (!name) return "배송사 확인 중";
  return /cj|packet/i.test(name) ? "국제특송" : name;
}

export function maskName(name?: string): string {
  const n = (name ?? "").trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}${"*".repeat(n.length - 2)}${n[n.length - 1]}`;
}

export type PublicTrackView = {
  productTitle: string;
  maskedName: string;
  trackingNo?: string;
  carrier: string;
  stageIndex: number;
  warn: boolean;
  routes: TrackRoute[];
  fetchedAt?: string;
};

/** 토큰 → 고객 공개용 뷰. 없음·만료·취소는 모두 null(같은 404) */
export function buildPublicTrackView(state: HqState, token: string, now = Date.now()): PublicTrackView | null {
  if (!token || token.length < 16) return null;
  const so = state.sourcingOrders.find((o) => trackTokenOf(o) === token);
  if (!so || so.status === "cancelled" || so.status === "failed") return null;
  const snap = trackSnapshotOf(so);
  if (snap?.deliveredAt && now - Date.parse(snap.deliveredAt) > EXPIRE_MS) return null;
  const pr = state.purchaseRequests.find((p) => p.id === so.purchaseRequestId);
  const stage = trackStage(snap?.status, so.status);
  return {
    productTitle: pr?.productTitle || "주문 상품",
    maskedName: maskName(pr?.shippingAddress?.name ?? pr?.buyerName),
    trackingNo: so.trackingNo,
    carrier: customerCarrier(so.logisticName ?? so.carrier),
    stageIndex: stage.index,
    warn: stage.warn,
    routes: (snap?.routes ?? []).map((r) => ({ time: r.time, place: r.place, text: customerText(r.text) })),
    fetchedAt: snap?.fetchedAt,
  };
}
