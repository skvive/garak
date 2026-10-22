// filepath: src/lib/payments/init.ts
import { appBaseUrl, danalConfigured, stripeConfigured, tossConfigured } from "./config";
import { getDanalPublicConfig } from "./danal";
import { createStripeCheckoutSession } from "./stripe";
import { getTossPublicConfig } from "./toss";
import type { PaymentInitResult, PaymentProvider } from "./types";
import { createPendingOrder, markOrderPaid, type CheckoutInput } from "@/lib/checkout";

export async function initPayment(
  input: CheckoutInput,
  provider: PaymentProvider,
): Promise<PaymentInitResult> {
  if (provider === "stripe" && !stripeConfigured()) {
    throw new Error("Stripe 미설정 — STRIPE_SECRET_KEY를 확인하세요.");
  }
  if (provider === "toss" && !tossConfigured()) {
    throw new Error("토스페이먼츠 미설정 — TOSS_SECRET_KEY / NEXT_PUBLIC_TOSS_CLIENT_KEY를 확인하세요.");
  }
  if (provider === "danal" && !danalConfigured()) {
    throw new Error("다날 미설정 — DANAL_* 환경 변수를 확인하세요.");
  }

  const pending = await createPendingOrder(input, provider);
  const base = appBaseUrl();

  if (provider === "mock") {
    const paymentRef = `mock_${pending.paymentOrderId}`;
    await markOrderPaid({
      paymentOrderId: pending.paymentOrderId,
      orderId: pending.orderId,
      paymentRef,
      provider: "mock",
    });
    return {
      provider: "mock",
      orderId: pending.orderId,
      paymentRef,
      redirectUrl: `${base}/checkout/success?provider=mock&ref=${encodeURIComponent(paymentRef)}&total=${pending.total}`,
    };
  }

  if (provider === "stripe") {
    const session = await createStripeCheckoutSession({
      orderId: pending.orderId,
      paymentOrderId: pending.paymentOrderId,
      amountUsd: pending.total,
      customerEmail: input.email,
      productSummary: pending.orderName,
    });
    return {
      provider: "stripe",
      orderId: pending.orderId,
      paymentOrderId: pending.paymentOrderId,
      checkoutUrl: session.url,
    };
  }

  if (provider === "toss") {
    const { clientKey } = getTossPublicConfig();
    const customerKey = `lexi_${Buffer.from(input.email).toString("base64url").slice(0, 40)}`;
    return {
      provider: "toss",
      orderId: pending.orderId,
      paymentOrderId: pending.paymentOrderId,
      amountKrw: pending.amountKrw,
      orderName: pending.orderName,
      clientKey,
      customerKey,
      successUrl: `${base}/checkout/success?provider=toss`,
      failUrl: `${base}/checkout?fail=toss`,
    };
  }

  // danal
  const danal = getDanalPublicConfig();
  return {
    provider: "danal",
    orderId: pending.orderId,
    paymentOrderId: pending.paymentOrderId,
    amountKrw: pending.amountKrw,
    orderName: pending.orderName,
    clientKey: danal.clientKey,
    merchantId: danal.merchantId,
    sandbox: danal.sandbox,
    returnUrl: `${base}/checkout/success?provider=danal`,
  };
}
