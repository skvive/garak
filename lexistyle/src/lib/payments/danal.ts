// filepath: src/lib/payments/danal.ts
/**
 * lawygofind `src/lib/payments/danal.ts` 이식 — 원샷 승인 API
 */
import { danalClientKey } from "./config";

export function getDanalPublicConfig() {
  return {
    clientKey: danalClientKey(),
    merchantId: process.env.DANAL_MERCHANT_ID ?? "",
    sandbox: process.env.DANAL_SANDBOX !== "false",
  };
}

export async function confirmDanalPayment(input: {
  transactionId: string;
  orderId: string;
  amount: number;
  method?: string;
}) {
  const secretKey = process.env.DANAL_SECRET_KEY;
  const merchantId = process.env.DANAL_MERCHANT_ID;
  if (!secretKey || !merchantId) {
    throw new Error("Danal 결제 환경 변수가 설정되지 않았습니다.");
  }

  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const res = await fetch("https://one-api.danalpay.com/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: input.method ?? "CARD",
      transactionId: input.transactionId,
      merchantId,
      amount: String(input.amount),
      orderId: input.orderId,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (!res.ok) {
    throw new Error(json.message ?? `Danal 승인 실패 (${res.status})`);
  }
  return json;
}
