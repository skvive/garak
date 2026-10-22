// filepath: src/lib/payments/toss.ts
/**
 * 토스페이먼츠 결제승인 API — LEXI 신규 연동
 * @see https://docs.tosspayments.com/reference#paymentConfirm
 */
import { tossClientKey } from "./config";

export function getTossPublicConfig() {
  return {
    clientKey: tossClientKey(),
  };
}

export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");

  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    message?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(json.message ?? `토스 승인 실패 (${res.status})`);
  }
  return json;
}
