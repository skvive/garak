/**
 * Amazon Australia (AU) — Export 판매채널 (SP-API).
 * Seller Central 없이 HQ export_jobs → Listings / Orders / 송장.
 */
import type { ChannelAdapter, PublishInput, PulledOrder } from "../types";
import { demoPulledOrder } from "../demo-order";
import type { Channel, ChannelListing, PurchaseRequest } from "@/lib/hq/types";
import type { PdpStructured } from "@/lib/pdp/ruleset";
import { validatePdpForChannel } from "@/lib/pdp/ruleset";
import { getCatalogById } from "@/lib/catalog/index-store";
import {
  amazonAuFullyConfigured,
  amazonAuListingMode,
  amazonAuLwaConfigured,
} from "../amazon/constants";
import { publishAmazonListing, patchAmazonStock } from "../amazon/listings";
import { confirmOrderShipment, getOrderItems, getUnshippedOrders } from "../amazon/sp-api";

let mockSeq = 90000;

function usdToAud(usd: number): number {
  const rate = Number(process.env.USD_AUD_RATE ?? 1.55);
  return Math.round(usd * rate * 100) / 100;
}

function safeImages(urls: string[]) {
  return urls.filter((u) => u && !/cjdropshipping\.com/i.test(u));
}

export const amazonAuAdapter: ChannelAdapter = {
  code: "amazon_au",

  async publish({ channel, listing, draft, options, pricing }: PublishInput) {
    const structured = (draft as { structured?: PdpStructured }).structured ?? {
      title: draft.title,
      subtitle: draft.subtitle ?? "",
      descriptionHtml: draft.descriptionHtml ?? "",
      usps: draft.seoKeywords?.slice(0, 3).map((k) => k) ?? ["Quality", "Curated", "LEXI"],
      faq: [],
      ctaLabel: "Add to bag",
      seoKeywords: draft.seoKeywords ?? ["LEXI"],
      galleryAssetIndexes: [],
    };

    const gateErrors = validatePdpForChannel("amazon_au", structured);
    if (gateErrors.length) throw new Error(`amazon_au validation: ${gateErrors.join("; ")}`);

    if (!amazonAuLwaConfigured()) {
      return { externalRef: `AMAZON-AU-MOCK-${listing.id}-${++mockSeq}` };
    }

    if (!amazonAuFullyConfigured()) {
      const mode = amazonAuListingMode();
      return { externalRef: `AMAZON-AU-MOCK-${mode.toUpperCase()}-${listing.id}-${++mockSeq}` };
    }

    const catalogId = (draft as { catalogId?: number }).catalogId;
    const catalog = catalogId != null ? await getCatalogById(catalogId) : null;
    const baseSku = `LEXI-${catalog?.id ?? listing.id}`;
    const sellUsd = pricing?.sellPriceUsd ?? listing.sellPriceUsd;
    const retailAud = listing.retailPriceUsd ? usdToAud(listing.retailPriceUsd) : undefined;
    const images = safeImages(draft.assets.map((a) => a.url));

    const variantRows =
      (options?.length ?? 0) > 0
        ? options!.map((o, i) => ({
            sku: o.sku ?? `${baseSku}-${i + 1}`,
            sellPriceAud: usdToAud(o.priceUsd ?? sellUsd),
            stock: Math.max(0, Math.floor(o.stock ?? 10)),
          }))
        : [{ sku: baseSku, sellPriceAud: usdToAud(sellUsd), stock: 10 }];

    let lastRef = baseSku;
    for (const v of variantRows) {
      const result = await publishAmazonListing({
        sku: v.sku,
        structured,
        catalog,
        sellPriceAud: v.sellPriceAud,
        retailPriceAud: retailAud,
        imageUrls: images,
      });
      if (result.validationOnly) {
        lastRef = `AMAZON-AU-PREVIEW-${v.sku}`;
      } else {
        lastRef = v.sku;
        if (amazonAuFullyConfigured()) {
          try {
            await patchAmazonStock(v.sku, v.stock);
          } catch {
            /* stock patch best-effort */
          }
        }
      }
    }

    if (variantRows.length === 1 && lastRef.startsWith("AMAZON-AU-PREVIEW-")) {
      return { externalRef: lastRef };
    }
    return { externalRef: variantRows.length > 1 ? `${baseSku}-MULTI` : lastRef };
  },

  async pullOrders(channel: Channel, { liveListings }: { liveListings: ChannelListing[] }): Promise<PulledOrder[]> {
    const currency = process.env.AMAZON_AU_CURRENCY || channel.config.currency || "AUD";
    if (!amazonAuFullyConfigured()) {
      return [demoPulledOrder(channel, liveListings, {
        refPrefix: "AUORD",
        title: "Amazon AU product page order",
        buyerName: "John Smith",
        country: "AU",
        city: "Sydney",
        addr1: "1 George St",
        zip: "2000",
        phone: "+61-000-000-0000",
        paid: 49,
        currency,
        optionLabel: "Default",
        paymentMethod: "Amazon Pay",
      })];
    }

    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const res = await getUnshippedOrders(since);
    const orders = res.data.payload?.Orders ?? [];
    const listingByRef = new Map(liveListings.map((l) => [l.externalRef, l]));
    const out: PulledOrder[] = [];

    for (const o of orders) {
      const orderId = String(o.AmazonOrderId ?? "");
      if (!orderId) continue;
      const itemsRes = await getOrderItems(orderId);
      const items = itemsRes.data.payload?.OrderItems ?? [];
      const first = items[0] ?? {};
      const addr = (o.ShippingAddress ?? {}) as Record<string, string>;
      const sku = String(first.SellerSKU ?? "");
      const orderTotal = o.OrderTotal as { Amount?: number; CurrencyCode?: string } | undefined;
      const itemPrice = first.ItemPrice as { Amount?: number } | undefined;
      out.push({
        externalOrderRef: orderId,
        externalListingRef: listingByRef.get(sku)?.externalRef ?? sku,
        productTitle: String(first.Title ?? o.OrderType ?? ""),
        buyerName: String(addr.Name ?? "Amazon Buyer"),
        buyerEmail: undefined,
        buyerPhone: addr.Phone,
        buyerCountry: addr.CountryCode ?? "AU",
        shippingAddress: {
          name: addr.Name ?? "",
          country: addr.CountryCode ?? "AU",
          city: addr.City ?? "",
          addr1: addr.AddressLine1 ?? "",
          addr2: addr.AddressLine2 ?? "",
          zip: addr.PostalCode ?? "",
          phone: addr.Phone ?? "",
        },
        qty: Number(first.QuantityOrdered ?? 1),
        paidAmount: Number(orderTotal?.Amount ?? itemPrice?.Amount ?? 0),
        currency: String(orderTotal?.CurrencyCode ?? currency),
        optionLabel: String(first.ASIN ?? sku),
        paymentMethod: "Amazon",
        raw: {
          orderItemId: String(first.OrderItemId ?? ""),
          asin: String(first.ASIN ?? ""),
        },
      });
    }
    return out;
  },

  async ackOrder(_channel: Channel, pr: PurchaseRequest, info: { trackingNo?: string; carrier?: string }) {
    if (!amazonAuFullyConfigured() || !info.trackingNo) return;
    let orderItemId = pr.rawRow?.orderItemId ?? "";
    if (!orderItemId) {
      const itemsRes = await getOrderItems(pr.externalOrderRef);
      orderItemId = String(itemsRes.data.payload?.OrderItems?.[0]?.OrderItemId ?? "");
    }
    if (!orderItemId) throw new Error("amazon_au: order item id missing");
    await confirmOrderShipment({
      orderId: pr.externalOrderRef,
      orderItemId,
      quantity: pr.qty,
      trackingNumber: info.trackingNo,
      carrierCode: info.carrier,
    });
  },
};

/** Phase C — CJ stock → Amazon MFN qty (export된 SKU) */
export async function syncAmazonAuStockFromCatalog(catalogId: number, stock: number) {
  if (!amazonAuFullyConfigured()) return { ok: false, reason: "not configured" };
  const sku = `LEXI-${catalogId}`;
  await patchAmazonStock(sku, stock);
  return { ok: true, sku, stock };
}
