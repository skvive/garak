// filepath: src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { availableProviders, selectPaymentProvider } from "@/lib/payments/config";
import { initPayment } from "@/lib/payments/init";
import type { PaymentProvider } from "@/lib/payments/types";
import type { CheckoutInput } from "@/lib/checkout";
import { needsCustomsCode, validateCustomsCode } from "@/lib/customs";

export async function GET(req: Request) {
  const country = new URL(req.url).searchParams.get("country") ?? undefined;
  return NextResponse.json({
    providers: availableProviders(),
    // 구매자 국가 기준 추천 PG (KR→토스, 해외→Stripe)
    recommended: selectPaymentProvider(country),
  });
}

export async function POST(req: Request) {
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
