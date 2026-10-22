import { createHmac } from "crypto";
import {
  shopeeHost,
  shopeePartnerId,
  shopeeShopId,
  shopeePartnerConfigured,
  shopeeShopConfigured,
} from "./constants";
import { markShopeeApiFailure, markShopeeApiSuccess } from "./health-state";
import { currentShopeeScope } from "./scope";

const activePartnerId = () => currentShopeeScope()?.partnerId ?? shopeePartnerId();
const activeShopId = () => currentShopeeScope()?.shopId ?? shopeeShopId();
const activeHost = () => currentShopeeScope()?.host ?? shopeeHost();

let accessTokenMem = "";

function partnerKey() {
  return currentShopeeScope()?.partnerKey ?? (process.env.SHOPEE_PARTNER_KEY?.trim() || "");
}

function currentAccessToken() {
  return currentShopeeScope()?.accessToken ?? (accessTokenMem || process.env.SHOPEE_ACCESS_TOKEN?.trim() || "");
}

function sign(base: string) {
  return createHmac("sha256", partnerKey()).update(base).digest("hex");
}

function shopSignedUrl(path: string, extra?: Record<string, string>) {
  const partnerId = activePartnerId();
  const shopId = activeShopId();
  const accessToken = currentAccessToken();
  const timestamp = Math.floor(Date.now() / 1000);
  const base = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const q = new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    access_token: accessToken,
    shop_id: shopId,
    sign: sign(base),
    ...extra,
  });
  return `${activeHost()}${path}?${q.toString()}`;
}

function partnerSignedUrl(path: string) {
  const partnerId = activePartnerId();
  const timestamp = Math.floor(Date.now() / 1000);
  const base = `${partnerId}${path}${timestamp}`;
  const q = new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    sign: sign(base),
  });
  return `${activeHost()}${path}?${q.toString()}`;
}

async function refreshAccessToken() {
  const scope = currentShopeeScope();
  const refresh = scope?.refreshToken ?? process.env.SHOPEE_REFRESH_TOKEN?.trim();
  if (!refresh || !activePartnerId() || !activeShopId() || !partnerKey()) return;
  const path = "/api/v2/auth/access_token/get";
  const res = await fetch(partnerSignedUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refresh,
      partner_id: Number(activePartnerId()),
      shop_id: Number(activeShopId()),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; access_token?: string; refresh_token?: string; message?: string };
  if (res.ok && !json.error && json.access_token) {
    if (scope) {
      scope.accessToken = json.access_token;
      scope.refreshToken = json.refresh_token || scope.refreshToken;
      await scope.onTokens({ accessToken: scope.accessToken, refreshToken: scope.refreshToken });
    } else accessTokenMem = json.access_token;
  }
}

export async function shopeeRequest<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  opts?: { extra?: Record<string, string>; body?: unknown; form?: FormData; retried?: boolean },
): Promise<T> {
  if (currentShopeeScope() ? (!activePartnerId() || !activeShopId() || !partnerKey()) : (!shopeePartnerConfigured() || !shopeeShopConfigured())) {
    throw new Error("shopee credentials missing");
  }
  if (!currentAccessToken()) await refreshAccessToken();
  if (!currentAccessToken()) throw new Error("shopee access_token missing");

  const url = shopSignedUrl(path, opts?.extra);
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts?.form) {
    body = opts.form;
  } else if (method === "POST" && opts?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(30_000) });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    response?: T;
  } & T;

  const err = json.error && json.error !== "" ? json.error : "";
  if (!res.ok || err) {
    const msg = String(json.message || err || res.status);
    if (!opts?.retried && /invalid_acceess_token|invalid_access_token|error_auth/i.test(msg + err)) {
      const previousToken = currentAccessToken();
      await refreshAccessToken();
      if (currentAccessToken() !== previousToken) return shopeeRequest<T>(method, path, { ...opts, retried: true });
    }
    if (!currentShopeeScope()) markShopeeApiFailure(msg);
    throw new Error(`shopee ${path}: ${msg}`);
  }
  if (!currentShopeeScope()) markShopeeApiSuccess(path);
  return (json.response ?? json) as T;
}

export type ShopeeShopInfo = {
  shop_name?: string;
  region?: string;
  status?: string;
  is_cb?: boolean;
  shop_id?: number;
};

export async function getShopInfo() {
  return shopeeRequest<ShopeeShopInfo>("GET", "/api/v2/shop/get_shop_info");
}

export type ShopeeLogisticChannel = {
  logistic_id?: number;
  logistic_name?: string;
  enabled?: boolean;
};

export async function getChannelList() {
  return shopeeRequest<{ logistics_channel_list?: ShopeeLogisticChannel[] }>(
    "GET",
    "/api/v2/logistics/get_channel_list",
  );
}

export type ShopeeOrderRow = {
  order_sn?: string;
  order_status?: string;
};

export async function getOrderList(opts: { timeFrom: number; timeTo: number; orderStatus?: string; cursor?: string }) {
  return shopeeRequest<{ order_list?: ShopeeOrderRow[]; more?: boolean; next_cursor?: string }>("GET", "/api/v2/order/get_order_list", {
    extra: {
      time_range_field: "create_time",
      time_from: String(opts.timeFrom),
      time_to: String(opts.timeTo),
      page_size: "50",
      order_status: opts.orderStatus ?? "READY_TO_SHIP",
      ...(opts.cursor ? { cursor: opts.cursor } : {}),
    },
  });
}

export type ShopeeOrderDetail = {
  order_sn?: string;
  order_status?: string;
  buyer_username?: string;
  total_amount?: number;
  currency?: string;
  item_list?: {
    item_id?: number;
    model_id?: number;
    item_name?: string;
    item_sku?: string;
    model_sku?: string;
    model_quantity_purchased?: number;
    model_original_price?: number;
    model_discounted_price?: number;
    image_info?: { image_url?: string };
  }[];
  recipient_address?: {
    name?: string;
    phone?: string;
    town?: string;
    district?: string;
    city?: string;
    state?: string;
    region?: string;
    zipcode?: string;
    full_address?: string;
  };
};

export async function getOrderDetail(orderSns: string[]) {
  if (!orderSns.length) return { order_list: [] as ShopeeOrderDetail[] };
  return shopeeRequest<{ order_list?: ShopeeOrderDetail[] }>("GET", "/api/v2/order/get_order_detail", {
    extra: {
      order_sn_list: orderSns.slice(0, 50).join(","),
      response_optional_fields: "item_list,recipient_address,buyer_username,total_amount",
    },
  });
}

export async function getOrderDetailsForRange(opts: { timeFrom: number; timeTo: number; orderStatus?: string }) {
  const orderSns: string[] = [];
  let cursor = "";
  for (let page = 0; page < 100; page++) {
    const list = await getOrderList({ ...opts, cursor });
    orderSns.push(...(list.order_list ?? []).map((order) => String(order.order_sn ?? "")).filter(Boolean));
    if (!list.more) break;
    if (!list.next_cursor || list.next_cursor === cursor) throw new Error("shopee order pagination cursor missing");
    cursor = list.next_cursor;
  }

  const orders: ShopeeOrderDetail[] = [];
  for (let index = 0; index < orderSns.length; index += 50) {
    orders.push(...((await getOrderDetail(orderSns.slice(index, index + 50))).order_list ?? []));
  }
  return orders;
}

export async function shipOrder(orderSn: string, trackingNumber?: string) {
  return shopeeRequest("POST", "/api/v2/logistics/ship_order", {
    body: {
      order_sn: orderSn,
      dropoff: trackingNumber ? { tracking_number: trackingNumber } : undefined,
    },
  });
}

export async function addItem(body: Record<string, unknown>) {
  return shopeeRequest<{ item_id?: number }>("POST", "/api/v2/product/add_item", { body });
}

export async function updateStock(itemId: number, qty: number) {
  return shopeeRequest("POST", "/api/v2/product/update_stock", {
    body: {
      item_id: itemId,
      stock_list: [{ model_id: 0, seller_stock: [{ stock: Math.max(0, qty) }] }],
    },
  });
}

export async function getItemList(offset = 0) {
  return shopeeRequest<{ item?: { item_id?: number; item_status?: string }[]; has_next_page?: boolean; next_offset?: number }>(
    "GET",
    "/api/v2/product/get_item_list",
    {
      extra: {
        offset: String(offset),
        page_size: "50",
        item_status: "NORMAL",
      },
    },
  );
}

export async function getItemBaseInfo(itemIds: number[]) {
  if (!itemIds.length) return { item_list: [] as { item_id?: number; item_sku?: string }[] };
  return shopeeRequest<{ item_list?: { item_id?: number; item_sku?: string }[] }>("GET", "/api/v2/product/get_item_base_info", {
    extra: {
      item_id_list: itemIds.slice(0, 50).join(","),
    },
  });
}

export async function uploadImageFromUrl(imageUrl: string): Promise<string | null> {
  const img = await fetch(imageUrl);
  if (!img.ok) return null;
  const buf = Buffer.from(await img.arrayBuffer());
  const form = new FormData();
  form.append("image", new Blob([buf], { type: img.headers.get("content-type") || "image/jpeg" }), "item.jpg");
  const res = await shopeeRequest<{ image_info?: { image_id?: string } }>(
    "POST",
    "/api/v2/media_space/upload_image",
    { form },
  );
  return res.image_info?.image_id ?? null;
}
