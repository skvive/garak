import { createHmac } from "crypto";
import { COUPANG_API_HOST, coupangRelayUrl } from "./constants";
import { markCoupangApiFailure, markCoupangApiSuccess } from "./health-state";
import { assertInvoiceResponse, buildInvoiceDtos } from "./invoice";

function signedHeaders(method: string, path: string, query = "") {
  const signedDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace(/^\d{2}/, "");
  const message = signedDate + method + path + query;
  const signature = createHmac("sha256", process.env.COUPANG_SECRET_KEY!).update(message).digest("hex");
  return {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${process.env.COUPANG_ACCESS_KEY}, signed-date=${signedDate}, signature=${signature}`,
    "Content-Type": "application/json;charset=UTF-8",
    "X-EXTENDED-TIMEOUT": "90000",
  };
}

type CoupangEnvelope = { code?: string | number; message?: string; data?: unknown; nextToken?: string };

async function coupangEnvelope(method: "GET" | "POST" | "PUT" | "PATCH", path: string, query = "", body?: unknown): Promise<CoupangEnvelope> {
  const relay = coupangRelayUrl();
  const base = relay || COUPANG_API_HOST;
  const headers = signedHeaders(method, path, query) as Record<string, string>;
  if (relay) {
    if (!process.env.COUPANG_RELAY_SECRET) throw new Error("COUPANG_RELAY_SECRET required when COUPANG_RELAY_URL is set");
    headers["x-relay-secret"] = process.env.COUPANG_RELAY_SECRET;
  }
  const res = await fetch(`${base}${path}${query ? `?${query}` : ""}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as CoupangEnvelope;
  if (!res.ok || (json.code && json.code !== "SUCCESS" && json.code !== 200)) {
    const msg = String(json.message ?? res.status);
    markCoupangApiFailure(msg);
    throw new Error(`coupang ${path}: ${msg}`);
  }
  markCoupangApiSuccess(path);
  return json;
}

export async function coupangRequest(method: "GET" | "POST" | "PUT" | "PATCH", path: string, query = "", body?: unknown) {
  const json = await coupangEnvelope(method, path, query, body);
  return json.data ?? json;
}

/** 쿠팡 발주서 일단위 조회는 한 요청에 최대 31일. KST 날짜로 [from, to]. */
export function coupangLookbackRange(lookbackDays = 7, now = new Date()): { from: string; to: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
  const days = Math.min(Math.max(lookbackDays, 1), 31);
  return { from: fmt.format(new Date(now.getTime() - (days - 1) * 86_400_000)), to: fmt.format(now) };
}

/** 자동 주문 수집 범위. 쿠팡 API의 1회 최대치(31일)를 넘기지 않는다. */
export function coupangOrderLookbackDays(raw = process.env.COUPANG_ORDER_LOOKBACK_DAYS): number {
  const parsed = Number(raw ?? 31);
  if (!Number.isFinite(parsed)) return 31;
  return Math.min(Math.max(Math.trunc(parsed), 1), 31);
}

/** 연속 호출 시 429를 받는다. */
const ORDERSHEET_GAP_MS = 700;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function listOrdersheetsByStatus(status: string, lookbackDays = 7): Promise<Record<string, unknown>[]> {
  const vendorId = process.env.COUPANG_VENDOR_ID!;
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`;
  const { from, to } = coupangLookbackRange(lookbackDays);
  const rows: Record<string, unknown>[] = [];
  let nextToken = "";
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ createdAtFrom: from, createdAtTo: to, status, maxPerPage: "50" });
    if (nextToken) query.set("nextToken", nextToken);
    const json = await coupangEnvelope("GET", path, query.toString());
    rows.push(...ordersheetRows(json.data));
    nextToken = json.nextToken?.trim() ?? "";
    if (!nextToken) break;
    await sleep(ORDERSHEET_GAP_MS);
  }
  return rows;
}

function ordersheetRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const bag = data as Record<string, unknown>;
    for (const key of ["content", "orderSheets", "list"]) {
      if (Array.isArray(bag[key])) return bag[key] as Record<string, unknown>[];
    }
  }
  return [];
}

export async function listAcceptOrdersheets(lookbackDays = coupangOrderLookbackDays()) {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const [i, status] of ["ACCEPT", "INSTRUCT"].entries()) {
    if (i) await sleep(ORDERSHEET_GAP_MS);
    for (const row of await listOrdersheetsByStatus(status, lookbackDays)) {
      const id = String(row.shipmentBoxId ?? row.orderId ?? "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      rows.push(row);
    }
  }
  return rows;
}

type InvoiceRequest = {
  orderId: string;
  shipmentBoxId: string;
  invoiceNumber: string;
  deliveryCompanyCode: string;
  vendorItemIds: string[];
};

async function postInvoices(endpoint: "invoices" | "updateInvoices", opts: InvoiceRequest) {
  const vendorId = process.env.COUPANG_VENDOR_ID!;
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/orders/${endpoint}`;
  const data = await coupangRequest("POST", path, "", {
    vendorId,
    orderSheetInvoiceApplyDtos: buildInvoiceDtos(opts),
  });
  assertInvoiceResponse(data);
  return data;
}

/** 최초 송장 업로드 — 상품준비중(INSTRUCT) 주문 대상 */
export const uploadCoupangInvoices = (opts: InvoiceRequest) => postInvoices("invoices", opts);

/** 이미 송장이 있는 주문(배송지시·배송중·배송완료·업체직송 상태)의 송장 변경 */
export const updateCoupangInvoices = (opts: InvoiceRequest) => postInvoices("updateInvoices", opts);

export async function acknowledgeOrdersheet(orderId: string, shipmentBoxId: string) {
  const vendorId = process.env.COUPANG_VENDOR_ID!;
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/orders/${orderId}/ordersheets/acknowledgement`;
  return coupangRequest("PUT", path, "", {
    vendorId,
    shipmentBoxIds: [Number(shipmentBoxId) || shipmentBoxId],
  });
}
