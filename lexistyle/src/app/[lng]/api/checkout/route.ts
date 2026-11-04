// filepath: src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { availableProviders, selectPaymentProvider } from "@/lib/payments/config";
import { initPayment } from "@/lib/payments/init";
import type { PaymentProvider } from "@/lib/payments/types";
import type { CheckoutInput } from "@/lib/checkout";
import { needsCustomsCode, validateCustomsCode } from "@/lib/customs";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      providers: [],
      recommended: null,
      checkoutEnabled: false,
      reason: "입점·상품·결제 검수 전에는 신규 결제를 제공하지 않습니다.",
    });
  }
  const country = new URL(req.url).searchParams.get("country") ?? undefined;
  return NextResponse.json({
    providers: availableProviders(),
    // 구매자 국가 기준 추천 PG (KR→토스, 해외→Stripe)
    recommended: selectPaymentProvider(country),
  });
}

export async function POST(req: Request) {
  // Release gate: never capture money for demo products or unapproved merchants.
  // Requires a verified SKU-to-merchant mapping, stock, KRW totals and tested PG
  // settlement/refund flow before production checkout is enabled.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      error: "운영 상품 검증 및 결제 연동이 완료되지 않아 신규 주문·결제를 접수하지 않습니다.",
    }, { status: 503 });
  }
  try {
    const body = (await req.json()) as CheckoutInput & { provider?: PaymentProvider };
    if (!body.email || !body.name || !body.address1 || !body.country) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    if (needsCustomsCode(body.country)) {
      const customsErr = validateCustomsCode(body.customsCode);
      if (customsErr) {
        return NextResponse.json({ error: customsErr }, { status: 400 });
      }
    }
    // provider 미지정 시 구매자 국가로 자동 라우팅 (KR→토스, 해외→Stripe)
    const provider = body.provider ?? selectPaymentProvider(body.country);
    const allowed = availableProviders();
    if (!allowed.includes(provider)) {
      return NextResponse.json(
        { error: `provider '${provider}' unavailable`, available: allowed },
        { status: 400 },
      );
    }
    const result = await initPayment(body, provider);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
