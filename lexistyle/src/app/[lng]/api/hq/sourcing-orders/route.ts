import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { createSourcingOrder, type DisputeDraftRecord } from "@/lib/hq/services";
import { listPurchaseInbox } from "@/lib/hq/purchase-inbox";
import { getState } from "@/lib/hq/store";
import { CJ_ORDER_TABS, matchesCjTab, type CjOrderTab } from "@/lib/hq/cj-order";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") ?? undefined;
  const tab = url.searchParams.get("tab") ?? "all";
  const kind = url.searchParams.get("kind") ?? "wholesale";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const undelivered = url.searchParams.get("undelivered") === "1";
  const logistic = url.searchParams.get("logistic") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const data = listPurchaseInbox(await getState());
  let orders = data.rows.filter((r) => r.sourcingOrder);
  if (channel && channel !== "all") orders = orders.filter((r) => r.channel.code === channel);
  if (kind && kind !== "all") orders = orders.filter((r) => (r.sourcingOrder?.orderKind ?? "wholesale") === kind);
  if (tab && tab !== "all") {
    orders = orders.filter((r) => matchesCjTab(r.sourcingOrder?.cjStatus, tab as CjOrderTab));
  }
  if (q) {
    orders = orders.filter((r) => {
      const hay = [
        r.externalOrderRef,
        r.product.title,
        r.sourcingOrder?.supplierOrderRef,
        r.sourcingOrder?.cjOrderCode,
        r.sourcingOrder?.cjStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  if (undelivered) orders = orders.filter((r) => r.sourcingOrder?.undelivered);
  if (logistic) orders = orders.filter((r) => (r.sourcingOrder?.logisticName ?? "") === logistic);
  if (from) orders = orders.filter((r) => r.createdAt.slice(0, 10) >= from);
  if (to) orders = orders.filter((r) => r.createdAt.slice(0, 10) <= to);

  const allSo = data.rows.filter((r) => r.sourcingOrder);
  const kinded = kind && kind !== "all" ? allSo.filter((r) => (r.sourcingOrder?.orderKind ?? "wholesale") === kind) : allSo;
  const tabCounts = Object.fromEntries(
    CJ_ORDER_TABS.map((t) => [
      t.id,
      t.id === "all" ? kinded.length : kinded.filter((r) => matchesCjTab(r.sourcingOrder?.cjStatus, t.id)).length,
    ]),
  );
  const disputes = kinded
    .filter((r) => r.sourcingOrder?.disputeId || r.sourcingOrder?.openDispute || r.sourcingOrder?.disputeDraft)
    .map((r) => {
      const draft = r.sourcingOrder!.disputeDraft as DisputeDraftRecord | undefined;
      return {
        soId: r.sourcingOrder!.id,
        disputeId: r.sourcingOrder!.disputeId,
        orderRef: r.sourcingOrder!.supplierOrderRef,
        product: r.product.title,
        draft: r.sourcingOrder!.disputeId ? undefined : draft,
      };
    });
  const logistics = [...new Set(kinded.map((r) => r.sourcingOrder?.logisticName).filter((n): n is string => Boolean(n)))];
  return NextResponse.json({
    orders,
    channels: data.channels,
    counts: data.counts,
    tabCounts,
    disputes,
    logistics,
  });
}

/** POST {purchaseRequestId, autoVet?} — 검수(선택) 후 공급처 발주 */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  if (!b.purchaseRequestId) return bad("purchaseRequestId required");
  try {
    return NextResponse.json(
      await createSourcingOrder(Number(b.purchaseRequestId), actor, {
        autoVet: Boolean(b.autoVet),
        orderKind: b.orderKind === "sample" || b.orderKind === "inventory" ? b.orderKind : "wholesale",
      }),
    );
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}
