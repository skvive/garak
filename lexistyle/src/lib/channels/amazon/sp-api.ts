import { signSpApiHeaders } from "./sigv4";
import {
  AMAZON_AU_MARKETPLACE_ID,
  AMAZON_AU_SP_API_BASE,
  AMAZON_AU_SP_API_HOST,
  amazonAuLwaConfigured,
  amazonAuSellerId,
  amazonAuSigV4Configured,
} from "./constants";
import { markAmazonAuApiFailure, markAmazonAuApiSuccess } from "./health-state";

let cachedLwa: { value: string; expiresAt: number } | null = null;

export async function getAmazonLwaToken(): Promise<string> {
  if (cachedLwa && cachedLwa.expiresAt > Date.now()) return cachedLwa.value;
  if (!amazonAuLwaConfigured()) throw new Error("amazon_au LWA credentials missing");

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_AU_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_AU_CLIENT_ID!,
      client_secret: process.env.AMAZON_AU_CLIENT_SECRET!,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`amazon-au lwa: ${json.error_description ?? json.error ?? res.status}`);
  }
  cachedLwa = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in ?? 3600) - 300) * 1000 };
  return cachedLwa.value;
}

export type SpApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
  rawText: string;
};

export async function spApiRequest<T = unknown>(opts: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}): Promise<SpApiResponse<T>> {
  if (!amazonAuSigV4Configured()) throw new Error("amazon_au AWS SigV4 keys missing");
  const token = await getAmazonLwaToken();
  const query = new URLSearchParams(opts.query ?? {}).toString();
  const bodyStr = opts.body != null ? JSON.stringify(opts.body) : "";
  const headers = signSpApiHeaders({
    method: opts.method,
    path: opts.path,
    query,
    body: bodyStr,
    accessToken: token,
    accessKey: process.env.AMAZON_AU_AWS_ACCESS_KEY!,
    secretKey: process.env.AMAZON_AU_AWS_SECRET_KEY!,
  });

  const url = `${AMAZON_AU_SP_API_BASE}${opts.path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method: opts.method,
    headers: { ...headers, host: AMAZON_AU_SP_API_HOST },
    body: bodyStr || undefined,
  });
  const rawText = await res.text();
  let data: T;
  try {
    data = rawText ? (JSON.parse(rawText) as T) : ({} as T);
  } catch {
    data = { raw: rawText } as T;
  }
  if (!res.ok) {
    markAmazonAuApiFailure(`HTTP ${res.status}: ${rawText.slice(0, 200)}`);
    throw new Error(`amazon sp-api ${opts.method} ${opts.path}: ${res.status} ${rawText.slice(0, 240)}`);
  }
  markAmazonAuApiSuccess(opts.path);
  return { ok: true, status: res.status, data, rawText };
}

export async function getMarketplaceParticipations() {
  return spApiRequest<{ payload?: { marketplaceParticipations?: { marketplace?: { id?: string; name?: string }; participation?: { isParticipating?: boolean } }[] } }>({
    method: "GET",
    path: "/sellers/v1/marketplaceParticipations",
  });
}

export async function getProductTypes() {
  return spApiRequest<{ productTypes?: { name?: string; displayName?: string }[] }>({
    method: "GET",
    path: "/definitions/2020-09-01/productTypes",
    query: { marketplaceIds: AMAZON_AU_MARKETPLACE_ID },
  });
}

export type ListingPutBody = {
  productType: string;
  attributes: Record<string, unknown>;
  requirements?: string;
};

export async function putListingItem(opts: {
  sku: string;
  body: ListingPutBody;
  mode?: "VALIDATION_PREVIEW" | "VALIDATION_STRICT";
}) {
  const sellerId = amazonAuSellerId();
  if (!sellerId) throw new Error("AMAZON_AU_SELLER_ID missing");
  const query: Record<string, string> = { marketplaceIds: AMAZON_AU_MARKETPLACE_ID };
  if (opts.mode) query.mode = opts.mode;
  return spApiRequest({
    method: "PUT",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(opts.sku)}`,
    query,
    body: opts.body,
  });
}

export async function getListingItem(sku: string, includedData = "summaries,attributes,issues,offers,fulfillmentAvailability") {
  const sellerId = amazonAuSellerId();
  if (!sellerId) throw new Error("amazon_au SELLER_ID missing");
  return spApiRequest({
    method: "GET",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(sku)}`,
    query: { marketplaceIds: AMAZON_AU_MARKETPLACE_ID, includedData, issueLocale: "en_AU" },
  });
}

export async function searchListingItems(opts: { identifiers?: string[]; identifiersType?: string; pageSize?: number; pageToken?: string } = {}) {
  const sellerId = amazonAuSellerId();
  if (!sellerId) throw new Error("amazon_au SELLER_ID missing");
  return spApiRequest({
    method: "GET",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}`,
    query: {
      marketplaceIds: AMAZON_AU_MARKETPLACE_ID,
      includedData: "summaries,offers,fulfillmentAvailability,issues",
      ...(opts.identifiers?.length ? { identifiers: opts.identifiers.join(","), identifiersType: opts.identifiersType || "SKU" } : {}),
      ...(opts.pageSize ? { pageSize: String(opts.pageSize) } : {}),
      ...(opts.pageToken ? { pageToken: opts.pageToken } : {}),
    },
  });
}

export async function deleteListingItem(sku: string) {
  const sellerId = amazonAuSellerId();
  if (!sellerId) throw new Error("amazon_au SELLER_ID missing");
  return spApiRequest({
    method: "DELETE",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(sku)}`,
    query: { marketplaceIds: AMAZON_AU_MARKETPLACE_ID },
    body: { productType: "PRODUCT" },
  });
}

export async function listFinancialTransactions(opts: { postedAfter: string; postedBefore?: string; status?: string }) {
  return spApiRequest({
    method: "GET",
    path: "/finances/2024-06-19/transactions",
    query: {
      postedAfter: opts.postedAfter,
      ...(opts.postedBefore ? { postedBefore: opts.postedBefore } : {}),
      marketplaceId: AMAZON_AU_MARKETPLACE_ID,
      ...(opts.status ? { transactionStatus: opts.status } : {}),
    },
  });
}

export async function patchListingItem(opts: { sku: string; patches: { op: string; path: string; value: unknown }[] }) {
  const sellerId = amazonAuSellerId();
  if (!sellerId) throw new Error("AMAZON_AU_SELLER_ID missing");
  return spApiRequest({
    method: "PATCH",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(opts.sku)}`,
    query: { marketplaceIds: AMAZON_AU_MARKETPLACE_ID },
    body: { productType: "PRODUCT", patches: opts.patches },
  });
}

export async function getUnshippedOrders(createdAfter: string) {
  return spApiRequest<{ payload?: { Orders?: Record<string, unknown>[] } }>({
    method: "GET",
    path: "/orders/v0/orders",
    query: {
      MarketplaceIds: AMAZON_AU_MARKETPLACE_ID,
      OrderStatuses: "Unshipped",
      CreatedAfter: createdAfter,
    },
  });
}

export async function getOrderItems(orderId: string) {
  return spApiRequest<{ payload?: { OrderItems?: Record<string, unknown>[] } }>({
    method: "GET",
    path: `/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`,
  });
}

export async function confirmOrderShipment(opts: {
  orderId: string;
  orderItemId: string;
  quantity: number;
  trackingNumber: string;
  carrierCode?: string;
}) {
  const shipDate = new Date().toISOString().slice(0, 10);
  return spApiRequest({
    method: "POST",
    path: `/orders/v0/orders/${encodeURIComponent(opts.orderId)}/shipmentConfirmation`,
    body: {
      marketplaceId: AMAZON_AU_MARKETPLACE_ID,
      packageDetail: {
        packageReferenceId: `lexi-${Date.now()}`,
        carrierCode: opts.carrierCode ?? "Australia Post",
        trackingNumber: opts.trackingNumber,
        shipDate,
        orderItems: [{ orderItemId: opts.orderItemId, quantity: opts.quantity }],
      },
    },
  });
}
