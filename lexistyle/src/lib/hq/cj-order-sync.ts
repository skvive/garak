import { audit, mutate } from "./store";
import {
  cjConfigured,
  confirmCjCart,
  generateCjParentOrder,
  getCjOrder,
  getCjWallet,
  listCjMakeup,
  listCjOrders,
  payCjBalance,
} from "@/lib/sourcing/connectors/cjdropshipping";
import {
  canConfirmLexiSettlement,
  findSourcingOrderForCj,
  hqStatusFromCj,
  isCjShipmentRef as isShipmentRef,
  linkCjIds,
  type CjApiStatus,
  type CjRemoteOrder,
  type CjWalletSnapshot,
} from "./cj-order";
import { pushChannelInvoices } from "./channel-invoice";
import { ensureSettlementForDelivered } from "./services";
import { syncTrackingSnapshots } from "./track-sync";
import type { SourcingOrder } from "./types";

/** CJ 주문 API 한도 2회/초 — 초과 시 code 1600200으로 빈 목록 */
const CJ_LIST_GAP_MS = 600;
const sleep = (ms: number) => (cjConfigured() ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

const LIST_STATUSES: CjApiStatus[] = [
  "CREATED",
  "IN_CART",
  "UNPAID",
  "PENDING",
  "PROCESSING",
  "UNSHIPPED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

function applyRemote(so: SourcingOrder, remote: CjRemoteOrder) {
  linkCjIds(so, remote);
  so.cjStatus = remote.status;
  if (remote.orderCode) so.cjOrderCode = remote.orderCode;
  if (remote.productAmount != null && remote.productAmount > 0) so.costUsd = remote.productAmount;
  if (remote.postageAmount != null && remote.postageAmount > 0) so.shippingUsd = remote.postageAmount;
  if (remote.trackingNo) so.trackingNo = remote.trackingNo;
  if (remote.logisticName) {
    so.logisticName = remote.logisticName;
    so.carrier = remote.logisticName;
  }
  if (remote.disputeId) so.disputeId = remote.disputeId;
  so.openDispute = Boolean(remote.openDispute || remote.disputeId);
  if (remote.payUrl) so.payUrl = remote.payUrl;
  so.status = hqStatusFromCj(remote.status, so.status) as SourcingOrder["status"];
}

export async function syncCjSourcingOrders() {
  const result = await mutate(async (s) => {
    const targets = s.sourcingOrders.filter((o) => o.supplierOrderRef);

    const seen = new Set<string>();
    const merge = (remote: CjRemoteOrder) => {
      const so = findSourcingOrderForCj(targets, remote);
      if (!so) return;
      applyRemote(so, remote);
      const pr = s.purchaseRequests.find((p) => p.id === so.purchaseRequestId);
      if (pr && (so.status === "delivered" || so.status === "settled") && pr.status === "sourcing") pr.status = "fulfilled";
      if (so.status === "delivered") ensureSettlementForDelivered(s, so, "cj-sync");
      seen.add(String(so.id));
    };

    const ids = [...new Set(targets.map((o) => o.supplierOrderRef!).filter((r) => r && !isShipmentRef(r)))];
    if (ids.length) {
      const batch = await listCjOrders({ orderIds: ids, pageSize: 100 }).catch(() => ({ list: [] as CjRemoteOrder[] }));
      for (const row of batch.list) merge(row);
    }

    for (const status of LIST_STATUSES) {
      await sleep(CJ_LIST_GAP_MS);
      const page = await listCjOrders({ status, pageNum: 1, pageSize: 50 }).catch(() => ({ list: [] as CjRemoteOrder[] }));
      for (const row of page.list) merge(row);
    }

    for (const so of targets) {
      if (seen.has(String(so.id)) || !so.supplierOrderRef || isShipmentRef(so.supplierOrderRef)) continue;
      await sleep(CJ_LIST_GAP_MS);
      const one = await getCjOrder(so.supplierOrderRef).catch(() => null);
      if (one) {
        applyRemote(so, one);
        const pr = s.purchaseRequests.find((p) => p.id === so.purchaseRequestId);
        if (pr && (so.status === "delivered" || so.status === "settled") && pr.status === "sourcing") pr.status = "fulfilled";
        if (so.status === "delivered") ensureSettlementForDelivered(s, so, "cj-sync");
      }
    }

    const makeup = await listCjMakeup().catch(() => []);
    const makeupCodes = new Set(makeup.map((m) => m.orderCode));
    for (const so of s.sourcingOrders) {
      so.makeupOpen = Boolean(
        (so.cjOrderCode && makeupCodes.has(so.cjOrderCode)) ||
          (so.supplierOrderRef && makeupCodes.has(so.supplierOrderRef)) ||
          (so.cjShipmentOrderId && makeupCodes.has(so.cjShipmentOrderId)),
      );
    }

    return { matched: seen.size, listed: targets.length, makeup: makeup.length };
  });
  const invoices = await pushChannelInvoices();
  const tracking = await syncTrackingSnapshots().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  return { ...result, invoices, tracking };
}

/** CREATED·IN_CART → 장바구니 담기·확정 → UNPAID. CJ 화면 "주문 선택에 추가"와 같은 단계 */
async function confirmCart(so: SourcingOrder) {
  if (so.cjStatus !== "CREATED" && so.cjStatus !== "IN_CART") return;
  const sd = so.cjShipmentOrderId ?? (isShipmentRef(so.supplierOrderRef) ? so.supplierOrderRef : undefined);
  if (!sd) throw new Error("CJ 주문코드(SD) 없음 — CJ 동기화 후 다시 시도");
  const r = await confirmCjCart(sd, { inCart: so.cjStatus === "IN_CART" });
  if (r.intercepted.length) {
    so.cjConfirmError = `CJ 확정 차단: ${r.intercepted.join(", ")}`;
    throw new Error(so.cjConfirmError);
  }
  so.cjConfirmError = undefined;
  if (r.shipmentsId) so.cjPayShipmentId = r.shipmentsId;
  so.cjStatus = "UNPAID";
}

export async function confirmSourcingOrder(soId: number, actor: string) {
  return mutate(async (s) => {
    const so = s.sourcingOrders.find((o) => o.id === soId);
    if (!so?.supplierOrderRef) throw new Error("CJ 주문번호 없음");
    const before = so.cjStatus;
    await confirmCart(so);
    const remote = isShipmentRef(so.supplierOrderRef) ? null : await getCjOrder(so.supplierOrderRef).catch(() => null);
    if (remote) applyRemote(so, remote);
    audit(s, "sourcing_order", so.id, so.cjStatus ?? "UNPAID", actor, before, { action: "cart_confirm" });
    return so;
  });
}

export async function paySourcingOrder(soId: number, actor: string) {
  return mutate(async (s) => {
    const so = s.sourcingOrders.find((o) => o.id === soId);
    if (!so?.supplierOrderRef) throw new Error("CJ 주문번호 없음");
    await confirmCart(so);
    if (!cjConfigured()) await payCjBalance(so.supplierOrderRef);
    else {
      if (!so.cjPayShipmentId) throw new Error("CJ 결제묶음번호 없음 — CJ 화면 결제대기 탭에서 결제");
      const { payId } = await generateCjParentOrder(so.cjPayShipmentId);
      await payCjBalance(so.cjPayShipmentId, payId);
    }
    const remote = isShipmentRef(so.supplierOrderRef) ? null : await getCjOrder(so.supplierOrderRef);
    if (remote) applyRemote(so, remote);
    else {
      so.cjStatus = "PENDING";
      so.status = "confirmed";
    }
    audit(s, "sourcing_order", so.id, so.cjStatus ?? "PENDING", actor, "UNPAID", { action: "pay_balance" });
    return so;
  });
}

export async function loadCjMoney(): Promise<CjWalletSnapshot> {
  const wallet = await getCjWallet();
  const makeup = await listCjMakeup().catch(() => []);
  const unpaidPage = await listCjOrders({ status: "UNPAID", pageNum: 1, pageSize: 50 }).catch(() => ({ list: [], total: 0 }));
  const disputePage = await listCjOrders({ status: "SHIPPED", pageNum: 1, pageSize: 50 }).catch(() => ({ list: [] }));
  const unpaidSumUsd = unpaidPage.list.reduce((a, o) => a + (o.orderAmount ?? o.productAmount ?? 0), 0);
  const disputeCount = disputePage.list.filter((o) => o.disputeId || o.openDispute).length;
  return {
    availableUsd: wallet.availableUsd,
    freezeUsd: wallet.freezeUsd,
    unpaidCount: unpaidPage.total || unpaidPage.list.length,
    unpaidSumUsd: +unpaidSumUsd.toFixed(2),
    makeupCount: makeup.length,
    makeupSumUsd: +makeup.reduce((a, m) => a + m.amount, 0).toFixed(2),
    disputeCount,
    mock: wallet.mock,
  };
}

export function settlementBlockedReason(so?: SourcingOrder): string | null {
  if (!so) return null;
  if (!canConfirmLexiSettlement({ cjStatus: so.cjStatus, makeupOpen: so.makeupOpen })) {
    if (so.makeupOpen) return "CJ 차액(makeup) 미결제";
    return "CJ 결제대기 — 마진 확정 불가";
  }
  return null;
}
