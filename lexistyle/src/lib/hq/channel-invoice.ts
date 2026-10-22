import { getChannelAdapter } from "@/lib/channels/registry";
import { coupangKeysConfigured } from "@/lib/channels/coupang/constants";
import { audit, getState, iso, mutate } from "./store";
import type { PurchaseRequest, SourcingOrder } from "./types";

const INVOICE_STATUSES = new Set(["shipped", "delivered", "settled"]);

export function needsChannelInvoice(so: SourcingOrder): boolean {
  if (!so.trackingNo || !INVOICE_STATUSES.has(so.status)) return false;
  return so.orderPayload?.channelInvoiceTracking !== so.trackingNo;
}

type BoxMember = { so: SourcingOrder; pr: PurchaseRequest };

export type InvoiceBoxPlan =
  | { kind: "push"; trackingNo: string; carrier?: string; lead: BoxMember; members: BoxMember[] }
  | { kind: "wait"; members: BoxMember[] }
  | { kind: "split"; members: BoxMember[] };

/**
 * 쿠팡 송장은 shipmentBoxId(배송 상자) 단위다. 상자 안 상품이 모두 같은 송장을 받았을 때만 한 번 올린다.
 * 상품별 송장이 다르면 분할배송이라 Wing에서 처리해야 한다.
 */
export function planInvoiceBox(members: BoxMember[]): InvoiceBoxPlan {
  const live = members.filter((m) => m.so.status !== "cancelled" && m.so.status !== "failed");
  if (!live.length || live.some((m) => !m.so.trackingNo || !INVOICE_STATUSES.has(m.so.status))) {
    return { kind: "wait", members };
  }
  const trackings = new Set(live.map((m) => m.so.trackingNo));
  if (trackings.size > 1) return { kind: "split", members: live };
  const lead = live[0]!;
  return { kind: "push", trackingNo: lead.so.trackingNo!, carrier: lead.so.logisticName || lead.so.carrier, lead, members: live };
}

function boxKeyOf(channelCode: string, pr: PurchaseRequest, so: SourcingOrder): string {
  const box = pr.rawRow?.shipmentBoxId;
  return channelCode === "coupang" && box ? `coupang:${box}` : `${channelCode}:so:${so.id}`;
}

function markInvoice(so: SourcingOrder, trackingNo: string, error?: string) {
  so.orderPayload = {
    ...(so.orderPayload ?? {}),
    ...(error
      ? { channelInvoiceError: error }
      : { channelInvoiceTracking: trackingNo, channelInvoiceAt: iso(), channelInvoiceError: "" }),
  };
}

async function markMembers(soIds: number[], trackingNo: string, error?: string, channelCode?: string) {
  await mutate((state) => {
    for (const id of soIds) {
      const so = state.sourcingOrders.find((o) => o.id === id);
      if (!so) continue;
      markInvoice(so, trackingNo, error);
      if (!error) {
        audit(state, "sourcing_order", so.id, "channel_invoice", "cj-bridge", so.status, { trackingNo, channel: channelCode });
      }
    }
  });
}

/** CJ 송장이 생긴 소싱발주를 판매채널(쿠팡 등)에 회신. API 호출은 스냅샷 락 밖에서 한다. */
export async function pushChannelInvoices(): Promise<{ pushed: number; failed: number; waiting: number; split: number }> {
  const s = await getState();
  const boxes = new Map<string, { channelCode: string; members: BoxMember[] }>();
  for (const pr of s.purchaseRequests) {
    const so = s.sourcingOrders.find((o) => o.purchaseRequestId === pr.id);
    const channel = s.channels.find((c) => c.id === pr.channelId);
    if (!so || !channel || !getChannelAdapter(channel.code)?.ackOrder) continue;
    if (channel.code === "coupang" && !coupangKeysConfigured()) continue;
    const key = boxKeyOf(channel.code, pr, so);
    const box = boxes.get(key) ?? { channelCode: channel.code, members: [] };
    box.members.push({ so, pr });
    boxes.set(key, box);
  }

  let pushed = 0;
  let failed = 0;
  let waiting = 0;
  let split = 0;
  for (const { channelCode, members } of boxes.values()) {
    if (!members.some((m) => needsChannelInvoice(m.so))) continue;
    const plan = planInvoiceBox(members);
    if (plan.kind === "wait") {
      waiting++;
      continue;
    }
    if (plan.kind === "split") {
      split++;
      const pending = plan.members.filter((m) => needsChannelInvoice(m.so));
      await markMembers(pending.map((m) => m.so.id), "", "분할배송 — 상자 내 송장이 달라 Wing에서 처리 필요");
      continue;
    }
    const channel = s.channels.find((c) => c.code === channelCode);
    const adapter = channel ? getChannelAdapter(channel.code) : null;
    if (!channel || !adapter?.ackOrder) continue;
    const ids = plan.members.map((m) => m.so.id);
    try {
      await adapter.ackOrder(channel, plan.lead.pr, {
        trackingNo: plan.trackingNo,
        carrier: plan.carrier,
        vendorItemIds: plan.members.map((m) => m.pr.rawRow?.vendorItemId ?? "").filter(Boolean),
      });
      await markMembers(ids, plan.trackingNo, undefined, channelCode);
      pushed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "invoice failed";
      if (/already|이미\s*등록|중복/i.test(message)) {
        await markMembers(ids, plan.trackingNo, undefined, channelCode);
        pushed++;
      } else {
        await markMembers(ids, plan.trackingNo, message);
        failed++;
      }
    }
  }
  return { pushed, failed, waiting, split };
}
