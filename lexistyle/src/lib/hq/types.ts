/** 역직구 HQ 도메인 타입 — docs/lexi-dropship-integration-spec.md §1 */

export type Supplier = {
  id: number;
  code: string;
  name: string;
  homepage?: string;
  connectorKind: "api" | "agent" | "scrape" | "mock";
  currency: string;
  leadTimeDays: number;
  asCenterUrl?: string;
  asPolicy?: string;
  legalNote?: string;
  status: "active" | "paused";
  createdAt: string;
};

export type SupplierProduct = {
  id: number;
  supplierId: number;
  externalId: string;
  url?: string;
  rawTitle: string;
  rawDescriptionHtml?: string;
  rawCategoryPath: string[];
  priceOriginal: number;
  currency: string;
  stock: number;
  sellerName?: string;
  sellerInfo?: Record<string, unknown>;
  images: { url: string }[];
  optionSchema?: Record<string, unknown>;
  contentHash: string;
  fetchedAt: string;
  syncStatus: "ok" | "stale" | "gone";
};

export type Collection = {
  id: number;
  slug: string;
  name: string;
  note?: string;
  ownerEmail?: string;
  createdAt: string;
};

export type CollectionItem = {
  id: number;
  collectionId: number;
  supplierProductId: number;
  decision: "candidate" | "approved" | "rejected";
  pinnedAt: string;
};

export type DesignBlock =
  | { type: "hero"; headline: string; sub?: string; assetIndex: number }
  | { type: "usp"; items: string[] }
  | { type: "gallery"; assetIndexes: number[] }
  | { type: "story"; html: string }
  | { type: "spec-table"; rows: [string, string][] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "cta"; label: string };

export type ListingOption = {
  name: string;
  sku?: string;
  priceUsd?: number;
  stock?: number;
  attributes?: Record<string, string>;
};

export type ListingDraft = {
  id: number;
  supplierProductId: number;
  collectionId?: number;
  version: number;
  title: string;
  subtitle?: string;
  descriptionHtml: string;
  seoKeywords: string[];
  designDoc: { blocks: DesignBlock[] };
  renderedHtml: string;
  assets: { kind: "hero" | "detail" | "thumb"; url: string; source: "ai" | "edited" | "template" }[];
  aiModel: string;
  generationJobId?: string;
  status: "draft" | "review" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  options?: ListingOption[];
  extraInfo?: Record<string, string>;
};

export type MarginPolicy = { type: "rate" | "fixed"; value: number; minMarginUsd: number };

export type Listing = {
  id: number;
  draftId: number;
  productSlug: string;
  marginPolicy: MarginPolicy;
  supplierCostUsd: number;
  sellPriceUsd: number;
  retailPriceUsd?: number;
  status: "ready" | "published" | "paused" | "retired";
  createdAt: string;
  extraInfo?: Record<string, string>;
};

export type Channel = {
  id: number;
  code: string;
  kind: "own" | "cafe24" | "coupang" | "shopee" | "shopify" | "lazada" | "qoo10" | "amazon" | "tiktok" | "marketplace";
  name: string;
  config: {
    tradeModel?: "reverse-dropship" | "purchase-agency";
    firstLineSupport?: boolean;
    currency?: string;
    feeRate?: number; // 채널 수수료율
    headerMap?: Record<string, string>;
    marginPolicy?: MarginPolicy; // 채널별 판매가 마진 정책 (미설정 시 기본 정책 사용)
  };
};

export type ChannelListing = {
  id: number;
  listingId: number;
  channelId: number;
  externalRef?: string;
  publishState: "queued" | "pushed" | "live" | "failed" | "delisted";
  lastPushedAt?: string;
  lastError?: string;
  retryCount: number;
};

export type ImportBatch = {
  id: number;
  channelId: number;
  filename: string;
  rowCount: number;
  okCount: number;
  errorRows: { line: number; error: string }[];
  importedBy?: string;
  importedAt: string;
};

export type PurchaseRequest = {
  id: number;
  channelId: number;
  importBatchId?: number;
  externalOrderRef: string;
  channelListingId?: number;
  /** 채널 상품페이지 SKU/상품키 — 미매칭이어도 보존 */
  externalListingRef?: string;
  /** 채널에서 온 판매 상품명 (매칭 전에도 표시) */
  productTitle?: string;
  productThumb?: string;
  rawRow?: Record<string, string>;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerCountry?: string;
  shippingAddress?: Record<string, string>;
  qty: number;
  channelPaidAmount: number;
  channelCurrency: string;
  optionLabel?: string;
  paymentMethod?: string;
  productUrl?: string;
  status:
    | "received" | "matched" | "vetted" | "sourcing"
    | "fulfilled" | "closed" | "rejected" | "refund_delegated";
  vettedBy?: string;
  vettedAt?: string;
  rejectReason?: string;
  createdAt: string;
};

export type SourcingOrder = {
  id: number;
  purchaseRequestId: number;
  supplierId: number;
  supplierProductId: number;
  orderPayload?: Record<string, unknown>;
  supplierOrderRef?: string;
  trackingNo?: string;
  carrier?: string;
  costUsd: number;
  shippingUsd: number;
  /** CJ API enum — UNPAID…CANCELLED. HQ status와 별도 */
  cjStatus?: string;
  cjOrderCode?: string;
  /** CJ 주문코드 SD… (createOrderV2 shipmentOrderId) — 장바구니 담기·확정 키. supplierOrderRef는 CJ orderId */
  cjShipmentOrderId?: string;
  /** 장바구니 확정 shipmentsId CJ… — 상위주문·잔액결제 키 */
  cjPayShipmentId?: string;
  /** CJ 장바구니 확정 실패/차단 사유 */
  cjConfirmError?: string;
  orderKind?: "sample" | "wholesale" | "inventory";
  disputeId?: string;
  openDispute?: boolean;
  payUrl?: string;
  makeupOpen?: boolean;
  undelivered?: boolean;
  logisticName?: string;
  status:
    | "requested" | "confirmed" | "shipped" | "delivered"
    | "settled" | "failed" | "cancelled" | "as_delegated";
  asTicketRef?: string;
  createdAt: string;
};

export type Settlement = {
  id: number;
  sourcingOrderId: number;
  channelId?: number;
  channelCode?: string;
  revenueUsd: number;
  costUsd: number;
  shippingUsd: number;
  channelFeeUsd: number;
  pgFeeUsd: number;
  marginUsd: number;
  fxRate: number;
  /** 정산 귀속 법인 — terrabridge(US) | partners-coop(KR). 2법인 구조 */
  payoutEntity?: "terrabridge" | "partners-coop";
  /** 라우팅 트랙 — A_overseas_large | B_domestic | C_overseas_test */
  payoutTrack?: "A_overseas_large" | "B_domestic" | "C_overseas_test";
  /** 국내 위탁판매(B): 파트너스 수탁 수수료 */
  consignmentCommissionUsd?: number;
  /** 국내 위탁판매(B): 테라브릿지로 송금할 금액 */
  remitToPrincipalUsd?: number;
  /** 환불/취소 관련 */
  refundAmountUsd?: number;
  refundReason?: string;
  refundAt?: string;
  /** 주문 날짜 (매출 귀속일) */
  orderDate?: string;
  settledAt?: string;
  status: "pending" | "confirmed" | "refunded" | "cancelled";
  /** LERP 연동 */
  lerpJournalId?: string;
  lerpSyncedAt?: string;
  createdAt: string;
};

/** 일별/월별/연별 매출 집계 */
export type RevenueSummary = {
  period: "daily" | "monthly" | "yearly";
  rows: {
    periodKey: string; // YYYY-MM-DD | YYYY-MM | YYYY
    channelCode: string;
    orderCount: number;
    revenueUsd: number;
    refundUsd: number;
    netRevenueUsd: number;
    costUsd: number;
    marginUsd: number;
  }[];
};

export type AuditEntry = {
  id: number;
  entity: string;
  entityId: string;
  fromState?: string;
  toState: string;
  actor: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

/** 북마크/휴지통 — 사용자별 상품 저장 */
export type BookmarkStatus = "bookmarked" | "archived" | "trash";

export type Bookmark = {
  id: number;
  catalogId: number;
  ownerEmail: string;
  status: BookmarkStatus;
  groupName?: string;
  note?: string;
  createdAt: string;
};

/** USD 기준 환율 (usdPerUnit: 해당 통화 1단위 = X USD) */
export const DEFAULT_FX: Record<string, number> = {
  USD: 1,
  CNY: 0.14,
  KRW: 0.00072,
  JPY: 0.0066,
  SGD: 0.75,
};

export function toUsd(amount: number, currency: string, fx: Record<string, number> = DEFAULT_FX) {
  const rate = fx[currency?.toUpperCase()] ?? 1;
  return +(amount * rate).toFixed(2);
}

/** 소싱비용 (USD) — 공급사 원가에 추가되는 물류·검수·포장 비용 */
export const SOURCING_FEE = 20;
/** 판매 마크업률 */
export const MARKUP_RATE = 1.3;

/**

/**
 * 판매가 산출: (원가 + 소싱비용 20달러) × 1.3 → .9 단위 올림
 * 공급사 원가(도매가)에 소싱비용 20USD를 더한 뒤 30% 마크업.
 * 모든 Export/Lexi 판매에 동일하게 적용.
 *
 * @deprecated 단일公式 대신 computeGlobalPrice() 로 채널별·국가별 세율을 정밀 계산할 것.
 *             docs/global-pricing-engine.md §6.3 참조.
 */
export function computeSellPrice(costUsd: number): number {
  const base = (costUsd + SOURCING_FEE) * MARKUP_RATE;
  return +(Math.ceil(base) - 0.1).toFixed(2); // x.9 프라이싱
}

/**
 * 소매가 산출: (판매가 + 20달러) × 1.3
 * 판매처(아마존, 쿠팡, 쇼피)에 진열될 때 표시되는 가격.
 *
 * @deprecated computeGlobalPrice() 로 채널별 가격을 정밀 계산할 것.
 */
export function computeRetailPrice(sellPriceUsd: number): number {
  const retail = (sellPriceUsd + SOURCING_FEE) * MARKUP_RATE;
  return +(Math.ceil(retail) - 0.1).toFixed(2); // x.9 프라이싱
}
