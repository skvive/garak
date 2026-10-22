import type { Channel, ChannelListing } from "@/lib/hq/types";
import type { PulledOrder } from "./types";

/** 키 없는 채널도 인박스가 비지 않도록 데모 주문 1건. live 리스팅이 있으면 매칭. */
export function demoPulledOrder(
  channel: Channel,
  liveListings: ChannelListing[],
  demo: {
    refPrefix: string;
    title: string;
    buyerName: string;
    country: string;
    city: string;
    addr1: string;
    zip: string;
    phone: string;
    paid: number;
    currency?: string;
    optionLabel?: string;
    paymentMethod?: string;
  },
): PulledOrder {
  const target = liveListings[0];
  return {
    externalOrderRef: `${demo.refPrefix}-${Date.now().toString().slice(-8)}`,
    externalListingRef: target?.externalRef,
    productTitle: demo.title,
    buyerName: demo.buyerName,
    buyerPhone: demo.phone,
    buyerCountry: demo.country,
    shippingAddress: {
      name: demo.buyerName,
      country: demo.country,
      city: demo.city,
      addr1: demo.addr1,
      zip: demo.zip,
      phone: demo.phone,
    },
    qty: 1,
    paidAmount: demo.paid,
    currency: demo.currency || channel.config.currency || "USD",
    optionLabel: demo.optionLabel ?? "기본",
    paymentMethod: demo.paymentMethod ?? ((demo.currency || channel.config.currency) === "KRW" ? "카드" : "Card"),
    raw: { mock: true, channel: channel.code },
  };
}
