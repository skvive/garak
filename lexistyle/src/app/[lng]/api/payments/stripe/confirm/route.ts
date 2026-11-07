// filepath: src/app/api/payments/stripe/confirm/route.ts
import { NextResponse } from "next/server";
import { findOrderByPaymentOrderId, markOrderPaid } from "@/lib/checkout";
import { retrieveStripeSession } from "@/lib/payments/stripe";

/** success 페이지에서 session_id로 즉시 확정 (웹훅 병행) */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = await retrieveStripeSession(body.sessionId);
    // A completed Checkout Session is not proof of captured funds.
    // "no_payment_required"/"unpaid" must never mark a pending order paid.
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "payment not completed" }, { status: 400 });
    }

    const paymentOrderId = session.metadata?.payment_order_id;
    const lexiOrderId = session.metadata?.lexi_order_id;
    if (!paymentOrderId || !lexiOrderId || !/^[0-9]+$/.test(lexiOrderId)) {
      return NextResponse.json({ error: "full order metadata required" }, { status: 400 });
    }

    // Bind the signed Stripe result to the server's original order and amount.
    // Never trust a client-provided total, session status, or arbitrary order id.
    const order = await findOrderByPaymentOrderId(paymentOrderId);
    if (!order || String(order.id) !== lexiOrderId
        || session.client_reference_id !== String(order.id)
        || order.paymentProvider !== "stripe") {
      return NextResponse.json({ error: "payment order mismatch" }, { status: 400 });
    }
    const expectedUsd = Number(order.totalUsd);
    const expectedCents = Math.max(50, Math.round(expectedUsd * 100));
    if (!Number.isFinite(expectedUsd) || expectedUsd <= 0
        || session.currency?.toLowerCase() !== "usd"
        || session.amount_total == null
        || session.amount_total !== expectedCents) {
      return NextResponse.json({ error: "payment amount or currency mismatch" }, { status: 400 });
    }

    const paid = await markOrderPaid({
      paymentOrderId,
      paymentRef: session.id,
      provider: "stripe",
    });

    const totalUsd =
      session.amount_total != null ? (session.amount_total / 100).toFixed(2) : undefined;

    return NextResponse.json({
      ok: true,
      orderId: paid.orderId,
      paymentRef: session.id,
      totalUsd,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
