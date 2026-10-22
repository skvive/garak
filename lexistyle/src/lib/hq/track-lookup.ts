import type { HqState } from "./store";
import { trackTokenOf } from "./track-public";

export type TrackMatch = { token: string; title: string };

const norm = (s?: string) => (s ?? "").replace(/\s+/g, "").toLowerCase();

/** 주문번호 + 받는 분 성함이 모두 일치하는 발주의 공개 토큰. 운송장이 아직 없어 토큰이 없으면 포함하지 않는다 */
export function findTrackMatches(state: HqState, orderNo: string, name: string): TrackMatch[] {
  const no = orderNo.trim();
  const who = norm(name);
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(no) || who.length < 2) return [];
  const out: TrackMatch[] = [];
  for (const pr of state.purchaseRequests) {
    if (pr.externalOrderRef.split(":")[0] !== no) continue;
    const owner = norm(pr.shippingAddress?.name) || norm(pr.buyerName);
    if (!owner || owner !== who) continue;
    const so = state.sourcingOrders.find((o) => o.purchaseRequestId === pr.id);
    const token = so ? trackTokenOf(so) : undefined;
    if (token) out.push({ token, title: pr.productTitle || "주문 상품" });
  }
  return out;
}

const attempts = new Map<string, number[]>();

/** 인스턴스 메모리 기준의 단순 시도 제한(서버리스에서는 인스턴스별). 주문번호 대입 공격을 늦추는 용도 */
export function allowLookupAttempt(key: string, now = Date.now(), max = 8, windowMs = 10 * 60_000): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return true;
}
