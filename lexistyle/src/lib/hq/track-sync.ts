import { mutate } from "./store";
import { cjConfigured, fetchCjTrackInfo } from "@/lib/sourcing/connectors/cjdropshipping";
import { createNotification } from "@/lib/notifications";
import { ensureTrackToken, publicTrackPath, trackSnapshotOf, trackStage, trackTokenOf, type TrackSnapshot } from "./track-public";
import type { SourcingOrder } from "./types";

/** 추적 API 한도 미확인 — 간격·1회 상한을 두고 크론마다 오래된 건부터 갱신 */
const MAX_PER_RUN = 12;
const GAP_MS = 1200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const finished = (so: SourcingOrder) => ["delivered", "settled", "cancelled", "failed"].includes(so.status);

/** 운송장 있는 발주에 공개 토큰 발급 → 미배송 건 추적 스냅샷 갱신 → 몰 주문 고객 알림(1회) */
export async function syncTrackingSnapshots() {
  return mutate(async (s) => {
    let issued = 0;
    let polled = 0;
    let failed = 0;
    let notified = 0;
    for (const so of s.sourcingOrders) {
      if (so.trackingNo && !trackTokenOf(so)) {
        ensureTrackToken(so);
        issued++;
      }
    }
    if (cjConfigured()) {
      const due = s.sourcingOrders
        .filter((so) => so.trackingNo && !finished(so))
        .sort((a, b) => (trackSnapshotOf(a)?.fetchedAt ?? "").localeCompare(trackSnapshotOf(b)?.fetchedAt ?? ""))
        .slice(0, MAX_PER_RUN);
      for (const so of due) {
        if (polled + failed) await sleep(GAP_MS);
        const info = await fetchCjTrackInfo(so.trackingNo!).catch(() => null);
        if (!info) {
          failed++;
          continue;
        }
        const prev = trackSnapshotOf(so);
        const delivered = trackStage(info.status, so.status).index === 5;
        const snapshot: TrackSnapshot = {
          status: info.status,
          routes: info.routes,
          fetchedAt: new Date().toISOString(),
          deliveredAt: prev?.deliveredAt ?? (delivered ? new Date().toISOString() : undefined),
        };
        so.orderPayload = { ...(so.orderPayload ?? {}), trackSnapshot: snapshot };
        polled++;
      }
    }
    for (const so of s.sourcingOrders) {
      const token = trackTokenOf(so);
      if (!token || so.orderPayload?.trackNotifiedAt) continue;
      const pr = s.purchaseRequests.find((p) => p.id === so.purchaseRequestId);
      if (!pr?.rawRow?.lexiOrderId || !pr.buyerEmail) continue;
      await createNotification(pr.buyerEmail, {
        type: "shipping",
        title: "배송 추적이 시작되었습니다",
        body: pr.productTitle,
        href: publicTrackPath(token),
      }).catch(() => undefined);
      so.orderPayload = { ...(so.orderPayload ?? {}), trackNotifiedAt: new Date().toISOString() };
      notified++;
    }
    return { issued, polled, failed, notified };
  });
}
