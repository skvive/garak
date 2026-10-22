import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { getState } from "@/lib/hq/store";
import type { RevenueSummary, Settlement } from "@/lib/hq/types";
import { settlementBlockedReason } from "@/lib/hq/cj-order-sync";

export const dynamic = "force-dynamic";

/** GET — 정산 집계 (일별/월별/연별) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "monthly") as "daily" | "monthly" | "yearly";
  const channel = url.searchParams.get("channel") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const s = await getState();
  const soById = new Map(s.sourcingOrders.map((o) => [o.id, o]));
  const prById = new Map(s.purchaseRequests.map((p) => [p.id, p]));
  const chById = new Map(s.channels.map((c) => [c.id, c]));

  const withChannel = (s.settlements as Settlement[]).map((x) => {
    if (x.channelCode) return x;
    const so = soById.get(x.sourcingOrderId);
    const pr = so ? prById.get(so.purchaseRequestId) : undefined;
    const ch = pr ? chById.get(pr.channelId) : undefined;
    return { ...x, channelCode: ch?.code, channelId: ch?.id ?? x.channelId };
  });

  // 필터 적용
  let filtered = withChannel;
  if (channel) filtered = filtered.filter((x) => x.channelCode === channel);
  if (from) filtered = filtered.filter((x) => (x.orderDate ?? x.createdAt) >= from);
  if (to) filtered = filtered.filter((x) => (x.orderDate ?? x.createdAt) <= to);

  // 기간별 집계
  const map = new Map<string, RevenueSummary["rows"][0]>();
  for (const x of filtered) {
    const date = x.orderDate ?? x.createdAt;
    let key: string;
    if (period === "daily") key = date.slice(0, 10);
    else if (period === "monthly") key = date.slice(0, 7);
    else key = date.slice(0, 4);

    const code = x.channelCode ?? "unknown";
    const groupKey = `${key}|${code}`;
    const existing = map.get(groupKey);
    if (existing) {
      existing.orderCount += 1;
      existing.revenueUsd += x.revenueUsd;
      existing.refundUsd += x.refundAmountUsd ?? 0;
      existing.netRevenueUsd = existing.revenueUsd - existing.refundUsd;
      existing.costUsd += x.costUsd + x.shippingUsd;
      existing.marginUsd += x.marginUsd;
    } else {
      map.set(groupKey, {
        periodKey: key,
        channelCode: code,
        orderCount: 1,
        revenueUsd: x.revenueUsd,
        refundUsd: x.refundAmountUsd ?? 0,
        netRevenueUsd: x.revenueUsd - (x.refundAmountUsd ?? 0),
        costUsd: x.costUsd + x.shippingUsd,
        marginUsd: x.marginUsd,
      });
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.periodKey.localeCompare(a.periodKey));

  // 전체 요약
  const total = rows.reduce(
    (acc, r) => ({
      orderCount: acc.orderCount + r.orderCount,
      revenueUsd: acc.revenueUsd + r.revenueUsd,
      refundUsd: acc.refundUsd + r.refundUsd,
      netRevenueUsd: acc.netRevenueUsd + r.netRevenueUsd,
      costUsd: acc.costUsd + r.costUsd,
      marginUsd: acc.marginUsd + r.marginUsd,
    }),
    { orderCount: 0, revenueUsd: 0, refundUsd: 0, netRevenueUsd: 0, costUsd: 0, marginUsd: 0 },
  );

  const pending = filtered
    .filter((x) => x.status === "pending")
    .map((x) => {
      const so = soById.get(x.sourcingOrderId);
      return {
        id: x.id,
        sourcingOrderId: x.sourcingOrderId,
        channelCode: x.channelCode,
        marginUsd: x.marginUsd,
        costUsd: x.costUsd,
        shippingUsd: x.shippingUsd,
        blocked: settlementBlockedReason(so),
      };
    });

  return NextResponse.json({
    period,
    rows,
    total,
    pending,
    channels: [...new Set(s.channels.map((c) => c.code))],
  });
}
