/**
 * Shopee SEA — Export 판매채널 (Open Platform v2).
 * Seller Center 없이 HQ export_jobs → add_item / orders / ship_order / stock.
 */
import type { ChannelAdapter, PublishInput, PulledOrder } from "../types";
import { demoPulledOrder } from "../demo-order";
import type { Channel, ChannelListing, PurchaseRequest } from "@/lib/hq/types";
import type { PdpStructured } from "@/lib/pdp/ruleset";
import { validatePdpForChannel } from "@/lib/pdp/ruleset";
import { getCatalogById } from "@/lib/catalog/index-store";
import { shopeeCurrency, shopeeFullyConfigured, shopeeListingMode } from "../shopee/constants";
import { getOrderDetailsForRange, shipOrder, type ShopeeOrderDetail } from "../shopee/api";
import { findShopeeItemIdBySku, patchShopeeStock, publishShopeeItem } from "../shopee/listings";

let mockSeq = 70000;

const RATE_FROM_USD: Record<string, number> = {
  SGD: 1.35, MYR: 4.7, THB: 36, VND: 25000, PHP: 58, IDR: 16000, TWD: 32, BRL: 5.2,
};

function toLocal(usd: number, currency: string): number {
  const rate = RATE_FROM_USD[currency] ?? 1;
  return currency === "VND" || currency === "IDR" ? Math.round(usd * rate) : +(usd * rate).toFixed(2);
}

function countryFromCurrency(currency: string): string {
  const map: Record<string, string> = {
    SGD: "SG", MYR: "MY", THB: "TH", VND: "VN", PHP: "PH", IDR: "ID", TWD: "TW", BRL: "BR",
  };
  return map[currency] ?? "SG";
}

function safeImages(urls: string[]) {
  return urls.filter((u) => u && !/cjdropshipping\.com/i.test(u));
}

export function mapShopeeOrderDetails(
  orders: ShopeeOrderDetail[],
  currency: string,
): PulledOrder[] {
  return orders.flatMap((order) => {
    const orderSn = String(order.order_sn ?? "");
    const address = order.recipient_address ?? {};
    const items = order.item_list ?? [];
    return items.map((item) => {
      const itemId = String(item.item_id ?? "");
      const modelId = String(item.model_id ?? "0");
      const qty = Number(item.model_quantity_purchased ?? 1);
      const unitPrice = Number(item.model_discounted_price ?? item.model_original_price ?? 0);
      return {
        externalOrderRef: `${orderSn}:${itemId}:${modelId}`,
        externalListingRef: itemId,
        productTitle: String(item.item_name ?? ""),
        productThumb: item.image_info?.image_url,
        buyerName: String(address.name ?? order.buyer_username ?? "Shopee Buyer"),
        buyerPhone: address.phone,
        buyerCountry: address.region ?? countryFromCurrency(currency),
        shippingAddress: {
          name: address.name ?? "",
          country: address.region ?? countryFromCurrency(currency),
          city: address.city ?? "",
          addr1: address.full_address ?? "",
          zip: address.zipcode ?? "",
          phone: address.phone ?? "",
        },
        qty,
        paidAmount: unitPrice ? unitPrice * qty : Number(order.total_amount ?? 0),
        currency: String(order.currency ?? currency),
        optionLabel: String(item.item_sku ?? ""),
        paymentMethod: "ShopeePay",
        raw: { orderSn, itemId, modelId, sku: item.item_sku },
      } satisfies PulledOrder;
    });
  });
}

export const shopeeAdapter: ChannelAdapter = {
  code: "shopee",

  async publish({ channel, listing, draft, options, pricing }: PublishInput) {
    const structured = (draft as { structured?: PdpStructured }).structured ?? {
      title: draft.title,
      subtitle: draft.subtitle ?? "",
      descriptionHtml: draft.descriptionHtml ?? "",
      usps: draft.seoKeywords?.slice(0, 3) ?? ["Quality", "Curated", "LEXI"],
      faq: [],
      ctaLabel: "Add to bag",
      seoKeywords: draft.seoKeywords ?? ["LEXI"],
      galleryAssetIndexes: [],
    };

    const gateErrors = validatePdpForChannel("shopee", structured);
    if (gateErrors.length) throw new Error(`shopee validation: ${gateErrors.join("; ")}`);

    const currency = shopeeCurrency() || channel.config.currency || "SGD";
    if (!shopeeFullyConfigured()) {
      return { externalRef: `SHOPEE-MOCK-${listing.id}-${++mockSeq}` };
    }
    if (!options?.length || options.some((option) => !option.sku || !Number.isInteger(option.stock) || option.stock! < 0)) {
      throw new Error("shopee: actual option SKU and verified stock required");
    }
    if (options.length !== 1) {
      throw new Error("shopee: variation products require model registration; refusing to merge variants into one item");
    }

    const effectiveUsd = pricing?.sellPriceUsd ?? listing.sellPriceUsd;
    const retailUsd = pricing?.retailPriceUsd ?? listing.retailPriceUsd ?? effectiveUsd;
    const catalogId = (draft as { catalogId?: number }).catalogId;
    const catalog = catalogId != null ? await getCatalogById(catalogId) : null;
    const sku = `LEXI-${catalog?.id ?? listing.id}`;
    const images = safeImages(draft.assets.map((a) => a.url));
    const result = await publishShopeeItem({
      sku,
      structured,
      catalog,
      sellPriceLocal: toLocal(effectiveUsd, currency),
      retailPriceLocal: toLocal(retailUsd, currency),
      imageUrls: images,
      stock: options[0].stock!,
    });

    if (result.validationOnly) {
      return { externalRef: `SHOPEE-PREVIEW-${sku}` };
    }
    return { externalRef: String(result.itemId ?? sku) };
  },

  async pullOrders(channel: Channel, { liveListings }: { liveListings: ChannelListing[] }): Promise<PulledOrder[]> {
    const currency = shopeeCurrency() || channel.config.currency || "SGD";
    if (!shopeeFullyConfigured()) {
      return [demoPulledOrder(channel, liveListings, {
        refPrefix: "SPORD",
        title: "Shopee listing order",
        buyerName: "Nurul",
        country: "SG",
        city: "Singapore",
        addr1: "1 Raffles Place",
        zip: "048616",
        phone: "+65-8000-0000",
        paid: toLocal(19, currency),
        currency,
        optionLabel: "Default",
        paymentMethod: "ShopeePay",
      })];
    }

    const now = Math.floor(Date.now() / 1000);
    const orders = await getOrderDetailsForRange({ timeFrom: now - 7 * 86400, timeTo: now, orderStatus: "READY_TO_SHIP" });
    return mapShopeeOrderDetails(orders, currency);
  },

  async ackOrder(_channel: Channel, pr: PurchaseRequest, info: { trackingNo?: string; carrier?: string }) {
    if (!shopeeFullyConfigured() || !info.trackingNo) return;
    const orderSn = String((pr.rawRow as { orderSn?: string } | undefined)?.orderSn ?? pr.externalOrderRef.split(":", 1)[0]);
    await shipOrder(orderSn, info.trackingNo);
  },
};

export async function syncShopeeStockFromCatalog(catalogId: number, stock: number) {
  if (!shopeeFullyConfigured()) return { ok: false, reason: "not configured" };
  const sku = `LEXI-${catalogId}`;
  const itemId = await findShopeeItemIdBySku(sku);
  if (!itemId) return { ok: false, reason: `item not found for ${sku}` };
  await patchShopeeStock(itemId, stock);
  return { ok: true, sku, itemId, stock };
}
