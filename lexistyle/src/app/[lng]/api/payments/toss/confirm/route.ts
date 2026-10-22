// filepath: src/app/api/payments/toss/confirm/route.ts
import { NextResponse } from "next/server";
import { findOrderByPaymentOrderId, markOrderPaid } from "@/lib/checkout";
import { confirmTossPayment } from "@/lib/payments/toss";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      paymentKey?: string;
      orderId?: string;
      amount?: number;
    };
    if (!body.paymentKey || !body.orderId || body.amount == null) {
      return NextResponse.json({ error: "paymentKey, orderId, amount required" }, { status: 400 });
    }

    const order = await findOrderByPaymentOrderId(body.orderId);
    if (order && order.amountKrw != null && order.amountKrw !== body.amount) {
      return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
    }

    const confirmed = await confirmTossPayment({
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount,
    });

    const paid = await markOrderPaid({
      paymentOrderId: body.orderId,
      paymentRef: confirmed.paymentKey || body.paymentKey,
      provider: "toss",
    });

    return NextResponse.json({
      ok: true,
      orderId: paid.orderId,
      paymentRef: confirmed.paymentKey || body.paymentKey,
      totalUsd: order?.totalUsd,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
