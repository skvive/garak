// filepath: src/app/api/payments/danal/confirm/route.ts
import { NextResponse } from "next/server";
import { findOrderByPaymentOrderId, markOrderPaid } from "@/lib/checkout";
import { confirmDanalPayment } from "@/lib/payments/danal";

/** lawygofind completeCreditPurchase 패턴 이식 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      transactionId?: string;
      orderId?: string;
      amount?: number;
      method?: string;
    };
    if (!body.transactionId || !body.orderId || body.amount == null) {
      return NextResponse.json(
        { error: "transactionId, orderId, amount required" },
        { status: 400 },
      );
    }

    const order = await findOrderByPaymentOrderId(body.orderId);
    if (order && order.amountKrw != null && order.amountKrw !== body.amount) {
      return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
    }

    await confirmDanalPayment({
      transactionId: body.transactionId,
      orderId: body.orderId,
      amount: body.amount,
      method: body.method,
    });

    const paid = await markOrderPaid({
      paymentOrderId: body.orderId,
      paymentRef: body.transactionId,
      provider: "danal",
    });

    return NextResponse.json({
      ok: true,
      orderId: paid.orderId,
      paymentRef: body.transactionId,
      totalUsd: order?.totalUsd,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
