/** Cafe24 어댑터 — 기존 lexistyle cafe24 모듈 재사용. 스펙 §4 */
import type { ChannelAdapter, PublishInput, PulledOrder } from "../types";
import { demoPulledOrder } from "../demo-order";
import type { Channel, ChannelListing } from "@/lib/hq/types";

let mockSeq = 70000;

export const cafe24Adapter: ChannelAdapter = {
  code: "cafe24",

  async publish({ listing, draft }: PublishInput) {
    const hasToken = Boolean(process.env.CAFE24_ACCESS_TOKEN && process.env.CAFE24_MALL_ID);
    if (!hasToken) {
      return { externalRef: `C24-MOCK-${listing.id}-${++mockSeq}` };
    }
    const { cafe24AdminCreateProduct } = await import("@/lib/cafe24/admin-products");
    const priceKrw = Math.round(listing.sellPriceUsd / 0.00072 / 10) * 10;
    const created = (await cafe24AdminCreateProduct({
      name: draft.title,
      priceKrw,
      description: draft.renderedHtml,
    })) as { product?: { product_no?: number } };
    return { externalRef: String(created?.product?.product_no ?? `C24-${listing.id}`) };
  },

  async pullOrders(channel: Channel, { liveListings }: { liveListings: ChannelListing[] }): Promise<PulledOrder[]> {
    const { cafe24ListOrders } = await import("@/lib/cafe24/orders");
    const listed = await cafe24ListOrders(30);
    const orders = (listed?.orders ?? []) as Record<string, unknown>[];
    if (orders.length > 0) {
      return orders.map((o) => {
        const rec = o as Record<string, any>;
        const item = rec.items?.[0] ?? rec.order_items?.[0] ?? {};
        return {
          externalOrderRef: String(rec.order_id ?? rec.orderId ?? ""),
          externalListingRef: String(item.product_no ?? item.productNo ?? ""),
          productTitle: String(item.product_name ?? item.productName ?? rec.order_place_name ?? ""),
          buyerName: String(rec.buyer_name ?? rec.billing_name ?? rec.receiver_name ?? ""),
          buyerEmail: rec.buyer_email,
          buyerPhone: rec.buyer_phone ?? rec.receiver_phone,
          buyerCountry: String(rec.receiver_country_code ?? "KR").slice(0, 2).toUpperCase(),
          shippingAddress: {
            name: String(rec.receiver_name ?? ""),
            country: String(rec.receiver_country_code ?? "KR"),
            addr1: String(rec.receiver_addr1 ?? rec.receiver_address ?? ""),
            zip: String(rec.receiver_zipcode ?? ""),
            phone: String(rec.receiver_phone ?? ""),
          },
          qty: Number(item.quantity ?? 1),
          paidAmount: Number(rec.payment_amount ?? rec.actual_payment_amount ?? item.product_price ?? 0),
          currency: channel.config.currency || "KRW",
          optionLabel: String(item.option_value ?? item.options ?? "").trim() || undefined,
          paymentMethod: String(rec.payment_method_name ?? rec.payment_method ?? rec.payment_gateway_name ?? "").trim() || undefined,
          raw: rec,
        };
      }).filter((o) => o.externalOrderRef);
    }
    return [demoPulledOrder(channel, liveListings, {
      refPrefix: "C24ORD",
      title: "Cafe24 상품페이지 주문",
      buyerName: "박구매",
      country: "KR",
      city: "서울",
      addr1: "마포구 월드컵북로 1",
      zip: "04000",
      phone: "010-1111-0000",
      paid: 32000,
      currency: "KRW",
      optionLabel: "230 / 블랙",
      paymentMethod: "카드",
    })];
  },
};

