// filepath: src/lib/payments/stripe.ts
/**
 * LawyGo `src/lib/stripe/stripeClient.ts` 이식 — LEXI 원샷(payment) Checkout Session
 */
import Stripe from "stripe";
import { appBaseUrl, stripeConfigured } from "./config";

/** LawyGo stripeConfig — Managed Payments 호환 API 버전 */
export const STRIPE_API_VERSION = "2026-05-27.dahlia";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!stripeConfigured()) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
      // LawyGo stripeConfig 이식 — SDK 타입보다 앞선 API 버전일 수 있음
      apiVersion: STRIPE_API_VERSION as never,
    });
  }
  return stripeClient;
}

export async function createStripeCheckoutSession(input: {
  orderId: number;
  paymentOrderId: string;
  amountUsd: number;
  customerEmail?: string;
  productSummary: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe가 설정되지 않았습니다. STRIPE_SECRET_KEY를 확인하세요.");

  const base = appBaseUrl();
  const amountCents = Math.max(50, Math.round(input.amountUsd * 100));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: input.productSummary || `LEXI Order #${input.orderId}`,
          },
        },
      },
    ],
    success_url: `${base}/checkout/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout?cancelled=1`,
    client_reference_id: String(input.orderId),
    metadata: {
      lexi_order_id: String(input.orderId),
      payment_order_id: input.paymentOrderId,
    },
  });

  if (!session.url) throw new Error("Stripe Checkout Session URL 생성 실패");
  return { sessionId: session.id, url: session.url };
}

export async function retrieveStripeSession(sessionId: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe 미설정");
  return stripe.checkout.sessions.retrieve(sessionId);
}
