// filepath: src/lib/cafe24/orders.ts
/**
 * Cafe24 Admin Orders — 결제 확정 후 미러 주문 생성 (hybrid SoT)
 * LEXI에서 PG(Toss/Stripe/…) 승인 후 Cafe24에 주문 기록을 남긴다.
 */
import { cafe24AdminConfigured, cafe24Mode, cafe24ShopNo } from "./config";
import { cafe24Fetch } from "./client";

export async function cafe24CreateOrderMirror(input: {
  orderId: string;
  buyerEmail: string;
  buyerName: string;
  items: Array<{ productNo: number; quantity: number; priceKrw: number }>;
  country?: string;
}) {
  if (cafe24Mode() === "off" || !cafe24AdminConfigured()) {
    return { skipped: true as const, reason: "admin token missing or mode off" };
  }

  try {
    const items = input.items.map((it) => ({
      product_no: it.productNo,
      quantity: it.quantity,
      product_price: String(it.priceKrw),
    }));

    const res = await cafe24Fetch<{ order?: { order_id?: string } }>({
      scope: "admin",
      method: "POST",
      path: "/orders",
      body: {
        shop_no: cafe24ShopNo(),
        request: {
          order_id: input.orderId,
          billing_name: input.buyerName,
          receiver_name: input.buyerName,
          buyer_email: input.buyerEmail,
          order_place_name: "LEXI Headless",
          paid: "T",
          items,
        },
      },
    });
    return { skipped: false as const, cafe24OrderId: res.order?.order_id ?? null };
  } catch (e) {
    console.error("[cafe24.orders.create]", e);
    return {
      skipped: true as const,
      reason: e instanceof Error ? e.message : "create failed",
    };
  }
}

export async function cafe24ListOrders(limit = 50) {
  if (!cafe24AdminConfigured()) return null;
  try {
    return await cafe24Fetch<{ orders?: unknown[] }>({
      scope: "admin",
      path: "/orders",
      query: { limit },
    });
  } catch (e) {
    console.error("[cafe24.orders.list]", e);
    return null;
  }
}
