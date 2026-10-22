// filepath: src/lib/payments/config.ts
import type { PaymentProvider } from "./types";

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** USD → KRW (토스/다날). 기본 1,350원 */
export function usdToKrw(usd: number) {
  const rate = Number(process.env.USD_KRW_RATE || 1350);
  return Math.max(100, Math.round(usd * rate));
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function tossConfigured() {
  return Boolean(
    process.env.TOSS_SECRET_KEY?.trim() &&
      (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || process.env.TOSS_CLIENT_KEY?.trim()),
  );
}

export function danalConfigured() {
  return Boolean(
    process.env.DANAL_SECRET_KEY?.trim() &&
      process.env.DANAL_MERCHANT_ID?.trim() &&
      (process.env.DANAL_CLIENT_KEY?.trim() || process.env.NEXT_PUBLIC_DANAL_CLIENT_KEY?.trim()),
  );
}

export function availableProviders(): PaymentProvider[] {
  const list: PaymentProvider[] = ["mock"];
  if (stripeConfigured()) list.push("stripe");
  if (tossConfigured()) list.push("toss");
  if (danalConfigured()) list.push("danal");
  return list;
}

/**
 * 구매자 시장(배송/결제 국가)에 따른 결제 PG 자동 라우팅.
 *
 *  - 국내(KR) 원화 결제 → 토스페이먼츠(영세·중소 우대 1.6~3.4%) → 다날 → mock
 *  - 해외(US/EU 등) 달러 결제 → Stripe(해외 카드 2.5~2.9%, Shopify Payments 상당) → mock
 *
 * 설정된(키 보유) PG가 없으면 mock으로 폴백해 흐름은 항상 이어진다.
 * 명시적으로 provider를 지정하면 그 값을 우선한다(이 함수는 미지정 시 기본값).
 */
export function selectPaymentProvider(country?: string): PaymentProvider {
  const isKR = (country ?? "").trim().toUpperCase() === "KR";
  if (isKR) {
    if (tossConfigured()) return "toss";
    if (danalConfigured()) return "danal";
    return "mock";
  }
  if (stripeConfigured()) return "stripe";
  return "mock";
}

export function tossClientKey() {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || process.env.TOSS_CLIENT_KEY?.trim() || "";
}

export function danalClientKey() {
  return process.env.NEXT_PUBLIC_DANAL_CLIENT_KEY?.trim() || process.env.DANAL_CLIENT_KEY?.trim() || "";
}
