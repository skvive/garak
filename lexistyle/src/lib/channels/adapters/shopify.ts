/**
 * Shopify Admin API 어댑터 — 자체 도메인 판매채널(own).
 * 인증은 앱 생성 시점에 따라 둘 중 하나:
 *   - 레거시 커스텀 앱(2026-01-01 이전 생성): 관리자에서 1회 노출된 정적 토큰 → SHOPIFY_ACCESS_TOKEN
 *   - Dev Dashboard 앱(2026-01-01 이후, 현재 기본): Client Credentials Grant —
 *     POST {domain}/admin/oauth/access_token (client_id/client_secret) → access_token 발급,
 *     expires_in=86399(24h) 고정, 별도 refresh token 없이 재요청으로만 갱신.
 *     앱과 스토어가 같은 Shopify organization 소속일 때만 사용 가능(shopify.dev 공식 제약).
 * env(SHOPIFY_STORE_DOMAIN + (ACCESS_TOKEN | CLIENT_ID·CLIENT_SECRET)) 미설정 시 목업 모드로
 * 폴백해 전체 파이프라인이 키 없이도 동작한다. (쿠팡/Shopee 어댑터와 동일한 계약)
 *
 * 필요한 env (레거시 또는 Dev Dashboard 중 하나):
 *   SHOPIFY_STORE_DOMAIN     {shop}.myshopify.com
 *   SHOPIFY_ACCESS_TOKEN     레거시 커스텀 앱의 정적 토큰(shpat_...)
 *   SHOPIFY_CLIENT_ID        Dev Dashboard 앱 Client ID
 *   SHOPIFY_CLIENT_SECRET    Dev Dashboard 앱 Client secret
 *   SHOPIFY_API_VERSION      API 버전 override (기본 2024-10)
 *   SHOPIFY_CURRENCY         표시 통화 override (기본 채널 config.currency → USD)
 */
import type { ChannelAdapter, PublishInput, PulledOrder } from "../types";
import { demoPulledOrder } from "../demo-order";
import type { Channel, ChannelListing, PurchaseRequest } from "@/lib/hq/types";
import { projectForShopify } from "@/lib/export/channel-projection";
import type { PdpStructured } from "@/lib/pdp/ruleset";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

function buildShopifyVariants(
  listingId: number,
  sellPriceUsd: number,
  options?: PublishInput["options"],
) {
  if (!options?.length) {
    return {
      options: undefined as undefined,
      variants: [
        {
          price: sellPriceUsd.toFixed(2),
          sku: `LEXI-${listingId}`,
          inventory_management: null,
          inventory_quantity: 10,
        },
      ],
    };
  }

  const hasColor = options.some((o) => o.attributes?.color);
  const hasSize = options.some((o) => o.attributes?.size);
  const productOptions: { name: string; values: string[] }[] = [];
  if (hasColor) {
    productOptions.push({
      name: "Color",
      values: [...new Set(options.map((o) => o.attributes?.color).filter(Boolean) as string[])],
    });
  }
  if (hasSize) {
    productOptions.push({
      name: "Size",
      values: [...new Set(options.map((o) => o.attributes?.size).filter(Boolean) as string[])],
    });
  }
  if (!productOptions.length) {
    productOptions.push({ name: "Variant", values: options.map((o) => o.name) });
  }

  const variants = options.map((o, i) => {
    const v: Record<string, string | number | null> = {
      price: (o.priceUsd ?? sellPriceUsd).toFixed(2),
      sku: o.sku ?? `LEXI-${listingId}-${i + 1}`,
      inventory_management: null,
      inventory_quantity: Math.max(0, Math.floor(o.stock ?? 10)),
    };
    if (hasColor) v.option1 = o.attributes?.color ?? o.name;
    if (hasSize) v.option2 = o.attributes?.size ?? "";
    if (!hasColor && !hasSize) v.option1 = o.attributes?.variant ?? o.name;
    return v;
  });

  return { options: productOptions, variants };
}

const configured = () =>
  Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      (process.env.SHOPIFY_ACCESS_TOKEN || (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET)),
  );

let cachedToken: { value: string; expiresAt: number } | null = null;

/** 정적 토큰(레거시) 우선 사용, 없으면 Client Credentials Grant로 발급받아 만료 5분 전까지 캐시. */
async function getAccessToken(): Promise<string> {
  if (process.env.SHOPIFY_ACCESS_TOKEN) return process.env.SHOPIFY_ACCESS_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`shopify token exchange: ${json.error_description ?? json.error ?? res.status}`);
  }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in ?? 86399) - 300) * 1000 };
  return cachedToken.value;
}

async function shopify(method: "GET" | "POST" | "PUT", path: string, body?: unknown) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const token = await getAccessToken();
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}${path}`, {
    method,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`shopify ${path}: ${json.errors ? JSON.stringify(json.errors) : res.status}`);
  }
  return json;
}

let mockSeq = 80000;

export const shopifyAdapter: ChannelAdapter = {
  code: "shopify",

  async publish({ channel, listing, draft, options, pricing }: PublishInput) {
    const currency = process.env.SHOPIFY_CURRENCY || channel.config.currency || "USD";
    if (!configured()) {
      return { externalRef: `SHOPIFY-MOCK-${listing.id}-${++mockSeq}` };
    }
    const effectivePrice = pricing?.sellPriceUsd ?? listing.sellPriceUsd;
    const structured = (draft as { structured?: PdpStructured }).structured ?? {
      title: draft.title,
      subtitle: draft.subtitle ?? "",
      descriptionHtml: draft.descriptionHtml ?? draft.renderedHtml ?? "",
      usps: [],
      faq: [],
      ctaLabel: "Add to bag",
      seoKeywords: draft.seoKeywords ?? ["LEXI"],
      galleryAssetIndexes: [],
    };
    const projected = projectForShopify(structured, null);
    const { options: productOptions, variants } = buildShopifyVariants(listing.id, effectivePrice, options);
    const data = await shopify("POST", "/products.json", {
      product: {
        title: projected.title,
        body_html: projected.body_html,
        vendor: projected.vendor,
        product_type: projected.product_type,
        tags: projected.tags.join(", "),
        status: "active",
        ...(productOptions ? { options: productOptions } : {}),
        variants,
        images: draft.assets.map((a) => ({ src: a.url })),
      },
    });
    return { externalRef: String(data?.product?.id ?? `SHOPIFY-${listing.id}`) };
  },

  async pullOrders(channel: Channel, { liveListings }: { liveListings: ChannelListing[] }): Promise<PulledOrder[]> {
    const currency = process.env.SHOPIFY_CURRENCY || channel.config.currency || "USD";
    if (!configured()) {
      return [demoPulledOrder(channel, liveListings, {
        refPrefix: "SFORD",
        title: "Shopify PDP 주문",
        buyerName: "Jane Doe",
        country: "US",
        city: "New York",
        addr1: "1 Fifth Ave",
        zip: "10003",
        phone: "+1-000-000-0000",
        paid: 29,
        currency,
        optionLabel: "Default",
        paymentMethod: "Shopify Payments",
      })];
    }
    const listingByRef = new Map(liveListings.map((l) => [l.externalRef, l]));
    const data = await shopify("GET", "/orders.json?status=open&fulfillment_status=unfulfilled&limit=50");
    const orders = (data?.orders ?? []) as Record<string, any>[];
    return orders.map((o) => {
      const productRef = String(o.line_items?.[0]?.product_id ?? "");
      const addr = o.shipping_address ?? {};
      return {
        externalOrderRef: String(o.id),
        externalListingRef: listingByRef.get(productRef)?.externalRef ?? productRef,
        productTitle: String(o.line_items?.[0]?.title ?? ""),
        buyerName: addr.name ?? `${o.customer?.first_name ?? ""} ${o.customer?.last_name ?? ""}`.trim(),
        buyerEmail: o.email ?? o.customer?.email,
        buyerPhone: addr.phone ?? o.phone,
        buyerCountry: addr.country_code ?? "US",
        shippingAddress: {
          name: addr.name ?? "", country: addr.country_code ?? "",
          city: addr.city ?? "", addr1: addr.address1 ?? "", addr2: addr.address2 ?? "",
          zip: addr.zip ?? "", phone: addr.phone ?? "",
        },
        qty: (o.line_items ?? []).reduce((sum: number, li: Record<string, any>) => sum + Number(li.quantity ?? 0), 0) || 1,
        paidAmount: Number(o.total_price ?? 0),
        currency: o.currency ?? currency,
        optionLabel: String(o.line_items?.[0]?.variant_title ?? o.line_items?.[0]?.sku ?? "").trim() || undefined,
        paymentMethod: String(o.payment_gateway_names?.[0] ?? o.gateway ?? "").trim() || undefined,
        raw: o,
      };
    });
  },

  async ackOrder(_channel: Channel, pr: PurchaseRequest, info: { trackingNo?: string; carrier?: string }) {
    if (!configured() || !info.trackingNo) return;
    // Shopify는 별도 발주확인 API가 없음 — 송장 등록(fulfillment 생성)이 곧 회신 역할.
    await shopify("POST", `/orders/${pr.externalOrderRef}/fulfillments.json`, {
      fulfillment: {
        tracking_number: info.trackingNo,
        tracking_company: info.carrier,
        notify_customer: true,
      },
    });
  },
};
