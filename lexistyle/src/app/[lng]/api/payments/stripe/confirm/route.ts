// filepath: src/app/api/payments/stripe/confirm/route.ts
import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/checkout";
import { retrieveStripeSession } from "@/lib/payments/stripe";

/** success 페이지에서 session_id로 즉시 확정 (웹훅 병행) */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = await retrieveStripeSession(body.sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "payment not completed" }, { status: 400 });
    }

    const paymentOrderId = session.metadata?.payment_order_id;
    const lexiOrderId = session.metadata?.lexi_order_id;
    if (!paymentOrderId && !lexiOrderId) {
      return NextResponse.json({ error: "order metadata missing" }, { status: 400 });
    }

    const paid = await markOrderPaid({
      paymentOrderId: paymentOrderId || undefined,
      orderId: lexiOrderId ? Number(lexiOrderId) : undefined,
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
