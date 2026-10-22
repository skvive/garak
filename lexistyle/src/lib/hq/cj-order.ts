/** CJ Shopping API 상태 ↔ HQ 소싱발주. DB/스냅샷에는 API enum을 저장한다. */

export const CJ_API_STATUSES = [
  "CREATED",
  "IN_CART",
  "UNPAID",
  "PENDING",
  "PROCESSING",
  "UNSHIPPED",
  "SHIPPED",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
  "OTHER",
] as const;

export type CjApiStatus = (typeof CJ_API_STATUSES)[number];

export type CjOrderKind = "sample" | "wholesale" | "inventory";

/** HQ 탭 — CJ Wholesale 화면과 동일 라벨 */
export type CjOrderTab =
  | "all"
  | "UNPAID"
  | "PENDING"
  | "DISPATCH_WAIT"
  | "SHIPPED"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED";

export const CJ_ORDER_TABS: { id: CjOrderTab; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "UNPAID", label: "결제대기" },
  { id: "PENDING", label: "대기" },
  { id: "DISPATCH_WAIT", label: "출고대기" },
  { id: "SHIPPED", label: "출고됨" },
  { id: "DELIVERED", label: "완료" },
  { id: "CLOSED", label: "마감" },
  { id: "CANCELLED", label: "취소" },
];

export const CJ_KIND_TABS: { id: CjOrderKind | "all"; label: string }[] = [
  { id: "wholesale", label: "도매" },
  { id: "sample", label: "샘플" },
  { id: "inventory", label: "재고" },
];

export type CjRemoteOrder = {
  orderId: string;
  orderCode?: string;
  /** createOrderV2 shipmentOrderId (SD…) — list `cjOrderId` / detail `cjOrderCode`. 장바구니(addCart) 키 */
  shipmentOrderId?: string;
  remark?: string;
  status: CjApiStatus;
  productAmount?: number;
  postageAmount?: number;
  orderAmount?: number;
  trackingNo?: string;
  logisticName?: string;
  disputeId?: string;
  openDispute?: boolean;
  payUrl?: string;
};

export type CjWalletSnapshot = {
  availableUsd: number;
  freezeUsd: number;
  unpaidCount: number;
  unpaidSumUsd: number;
  makeupCount: number;
  makeupSumUsd: number;
  disputeCount: number;
  mock: boolean;
};

export type CjMakeupBill = {
  orderCode: string;
  amount: number;
  orderType?: number;
  reason?: string;
};

export function parseCjApiStatus(raw: unknown): CjApiStatus {
  const s = String(raw ?? "").toUpperCase();
  return (CJ_API_STATUSES as readonly string[]).includes(s) ? (s as CjApiStatus) : "OTHER";
}

export function cjTabOf(status?: string): CjOrderTab | "draft" {
  const s = parseCjApiStatus(status);
  if (s === "CREATED" || s === "IN_CART") return "draft";
  if (s === "PROCESSING" || s === "UNSHIPPED") return "DISPATCH_WAIT";
  if (s === "UNPAID" || s === "PENDING" || s === "SHIPPED" || s === "DELIVERED" || s === "CLOSED" || s === "CANCELLED") {
    return s;
  }
  return "all";
}

export function matchesCjTab(status: string | undefined, tab: CjOrderTab): boolean {
  if (tab === "all") return true;
  return cjTabOf(status) === tab;
}

export function isCjUnpaid(status?: string): boolean {
  const s = parseCjApiStatus(status);
  return s === "UNPAID" || s === "CREATED" || s === "IN_CART";
}

export function canShipFromCj(status?: string): boolean {
  return !isCjUnpaid(status) && parseCjApiStatus(status) !== "CANCELLED";
}

export function canOpenDispute(status?: string): boolean {
  const s = parseCjApiStatus(status);
  return s !== "CLOSED" && s !== "CANCELLED" && s !== "CREATED" && s !== "IN_CART";
}

export function canConfirmLexiSettlement(opts: { cjStatus?: string; makeupOpen?: boolean }): boolean {
  if (opts.makeupOpen) return false;
  if (isCjUnpaid(opts.cjStatus)) return false;
  return true;
}

/** CJ 상태가 권위일 때 HQ 내부 status */
export function hqStatusFromCj(cj: CjApiStatus, current: string): string {
  if (cj === "CANCELLED") return "cancelled";
  if (cj === "DELIVERED" || cj === "CLOSED") {
    if (current === "settled") return "settled";
    return "delivered";
  }
  if (cj === "SHIPPED") return "shipped";
  if (current === "as_delegated") return "as_delegated";
  if (cj === "UNPAID" || cj === "CREATED" || cj === "IN_CART") return current === "requested" ? "requested" : "confirmed";
  return "confirmed";
}

export function cjPayPageUrl(orderId: string): string {
  // API(createOrderV2) 주문은 도매(purchaseList?orderType=3)가 아니라 드랍십 주문 목록에 쌓인다
  return `https://cjdropshipping.com/mine/dropshipping/orderList?orderType=6&keyword=${encodeURIComponent(orderId)}`;
}

/** 운송장 → 구매자에게 안내할 범용 추적 페이지 (쿠팡 업체직송은 쿠팡 내 추적 링크가 없다) */
export function trackingPageUrl(trackingNo: string): string {
  return `https://t.17track.net/ko#nums=${encodeURIComponent(trackingNo.trim())}`;
}

export function cjDisputeUrl(disputeId?: string): string {
  if (disputeId) return `https://cjdropshipping.com/disputes?id=${encodeURIComponent(disputeId)}`;
  return "https://cjdropshipping.com/disputes";
}

type CjLinkable = {
  purchaseRequestId: number;
  supplierOrderRef?: string;
  cjOrderCode?: string;
  cjShipmentOrderId?: string;
};

export const isCjShipmentRef = (ref?: string) => Boolean(ref && /^SD\d+/.test(ref));

/** CJ 주문 행 → HQ 발주. orderId · shipmentOrderId(SD…) · orderNum · remark "LEXI PR#id" 순 */
export function findSourcingOrderForCj<T extends CjLinkable>(orders: T[], remote: CjRemoteOrder): T | undefined {
  const linked = orders.filter((o) => o.supplierOrderRef);
  const hit =
    linked.find((o) => o.supplierOrderRef === remote.orderId) ??
    (remote.shipmentOrderId
      ? linked.find((o) => o.cjShipmentOrderId === remote.shipmentOrderId || o.supplierOrderRef === remote.shipmentOrderId)
      : undefined) ??
    (remote.orderCode ? linked.find((o) => o.cjOrderCode === remote.orderCode) : undefined);
  if (hit) return hit;
  const pr = remote.remark?.match(/LEXI PR#(\d+)/)?.[1];
  if (!pr) return undefined;
  return linked.find(
    (o) => o.purchaseRequestId === Number(pr) && (!o.cjShipmentOrderId || o.cjShipmentOrderId === remote.shipmentOrderId),
  );
}

/** supplierOrderRef = CJ orderId, cjShipmentOrderId = SD… (장바구니 키) 로 정규화 */
export function linkCjIds(so: CjLinkable, remote: CjRemoteOrder) {
  if (remote.shipmentOrderId) so.cjShipmentOrderId = remote.shipmentOrderId;
  else if (isCjShipmentRef(so.supplierOrderRef) && !so.cjShipmentOrderId) so.cjShipmentOrderId = so.supplierOrderRef;
  if (remote.orderId && !isCjShipmentRef(remote.orderId)) so.supplierOrderRef = remote.orderId;
}

export function mockStatusForRef(ref: string): CjApiStatus {
  const n = [...ref].reduce((a, c) => a + c.charCodeAt(0), 0);
  const cycle: CjApiStatus[] = [
    "UNPAID",
    "PENDING",
    "PROCESSING",
    "UNSHIPPED",
    "SHIPPED",
    "DELIVERED",
    "CLOSED",
    "CANCELLED",
  ];
  return cycle[n % cycle.length]!;
}
