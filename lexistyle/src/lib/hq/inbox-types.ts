import type { PurchaseRequest } from "./types";

export type InboxStage = "inspect" | "source" | "fulfill" | "settle" | "done" | "exception";

export type InboxMatchOption = { id: number; title: string; externalRef?: string };

export type PurchaseInboxRow = {
  id: number;
  externalOrderRef: string;
  status: PurchaseRequest["status"];
  stage: InboxStage;
  qty: number;
  paidAmount: number;
  currency: string;
  optionLabel?: string;
  paymentMethod?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerCountry?: string;
  shippingAddress?: Record<string, string>;
  createdAt: string;
  matched: boolean;
  canSource: boolean;
  channel: { id: number; code: string; name: string };
  product: {
    title: string;
    thumbUrl?: string;
    listingRef?: string;
    pageUrl?: string;
    description?: string;
    html?: string;
  };
  sourcingOrder?: {
    id: number;
    status: string;
    trackingNo?: string;
    /** 고객 공개 배송추적 페이지 주소 (운송장 발급 후 토큰 생성) */
    trackUrl?: string;
    supplierName?: string;
    nextTo?: string;
    cjStatus?: string;
    cjOrderCode?: string;
    orderKind?: string;
    costUsd?: number;
    shippingUsd?: number;
    disputeId?: string;
    openDispute?: boolean;
    payUrl?: string;
    makeupOpen?: boolean;
    undelivered?: boolean;
    logisticName?: string;
    supplierOrderRef?: string;
    cjConfirmError?: string;
    /** 채널 환불요청 → CJ 분쟁 준비안(접수 전) */
    disputeDraft?: Record<string, unknown>;
  };
  settlement?: { id: number; status: string; marginUsd: number };
};

const STAGE_LABEL: Record<InboxStage, string> = {
  inspect: "검수대기",
  source: "발주대기",
  fulfill: "배송중",
  settle: "정산대기",
  done: "완료",
  exception: "예외",
};

export const SO_NEXT: Record<string, string> = {
  requested: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export function inboxStageLabel(stage: InboxStage) {
  return STAGE_LABEL[stage];
}

export function inboxStageOf(
  pr: PurchaseRequest,
  soStatus?: string,
  stStatus?: string,
): InboxStage {
  if (pr.status === "rejected" || pr.status === "refund_delegated") return "exception";
  if (pr.status === "closed" || soStatus === "settled" || stStatus === "confirmed") return "done";
  if (stStatus === "pending" || pr.status === "fulfilled") return "settle";
  if (pr.status === "sourcing") return "fulfill";
  if (pr.status === "vetted") return "source";
  return "inspect";
}
