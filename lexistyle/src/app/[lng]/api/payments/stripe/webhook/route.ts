// filepath: src/app/api/payments/stripe/webhook/route.ts
/**
 * LawyGo `api/subscription/webhooks/stripe` 이식 — checkout.session.completed → 주문 paid
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markOrderPaid } from "@/lib/checkout";
import { getStripeClient } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook 미설정" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "signature 없음" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "signature 검증 실패" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "payment" || session.payment_status === "paid") {
      const paymentOrderId = session.metadata?.payment_order_id;
      const lexiOrderId = session.metadata?.lexi_order_id;
      try {
        await markOrderPaid({
          paymentOrderId: paymentOrderId || undefined,
          orderId: lexiOrderId ? Number(lexiOrderId) : undefined,
          paymentRef: session.id,
          provider: "stripe",
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "order update failed" },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
