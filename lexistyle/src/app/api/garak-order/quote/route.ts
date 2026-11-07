/**
 * Read-only server-side cart subtotal. Never returns a payable amount or PG link.
 * Product/merchant readiness checks are enforced by Neon data view.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { readyGarakProducts } from "@/lib/garak-order/ready-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, private" };
const skuPattern = /^GYS-[0-9]{3}$/;
const quoteSchema = z.object({
  items: z.array(z.object({
    sku: z.string().regex(skuPattern),
    qty: z.number().int().min(1).max(99),
  }).strict()).min(1).max(20),
  fulfillment: z.enum(["delivery", "pickup"]).default("delivery"),
}).strict();

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) {
    return NextResponse.json({ error: "application/json required" },
      { status: 415, headers: noStore });
  }
  if (Number(req.headers.get("content-length") ?? 0) > 12000) {
    return NextResponse.json({ error: "request too large" },
      { status: 413, headers: noStore });
  }
  let input: z.infer<typeof quoteSchema>;
  try {
    const raw = await req.text();
    if (raw.length > 12000) throw new Error("too large");
    input = quoteSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "잘못된 장바구니 형식입니다." },
      { status: 400, headers: noStore });
  }

  const skus = input.items.map(item => item.sku);
  if (new Set(skus).size !== skus.length) {
    return NextResponse.json({ error: "중복 상품은 수량을 합쳐서 요청하세요." },
      { status: 400, headers: noStore });
  }
  try {
    const products = await readyGarakProducts(skus);
    const bySku = new Map(products.map(item => [item.sku, item]));
    const lines = [];
    let subtotal = 0;
    let seller: string | null = null;
    for (const item of input.items) {
      const product = bySku.get(item.sku);
      if (!product) {
        return NextResponse.json({ error: "미승인 또는 판매 중단 상품입니다." },
          { status: 409, headers: noStore });
      }
      if (item.qty > product.stock) {
        return NextResponse.json({ error: "재고가 부족합니다." },
          { status: 409, headers: noStore });
      }
      if (seller && product.merchant_slug !== seller) {
        return NextResponse.json({ error: "서로 다른 상인 상품은 별도 주문이 필요합니다." },
          { status: 409, headers: noStore });
      }
      seller = product.merchant_slug;
      const lineTotal = product.price_krw * item.qty;
      subtotal += lineTotal;
      if (!Number.isSafeInteger(subtotal) || subtotal > 100000000) {
        return NextResponse.json({ error: "합계 계산 허용 범위를 초과했습니다." },
          { status: 400, headers: noStore });
      }
      lines.push({
        sku: product.sku,
        name: product.name,
        qty: item.qty,
        unit_price_krw: product.price_krw,
        line_total_krw: lineTotal,
      });
    }
    return NextResponse.json({
      data: {
        lines, merchant_slug: seller, subtotal_krw: subtotal, currency: "KRW",
        delivery_fee_krw: null, payable_total_krw: null,
        fulfillment: input.fulfillment, checkout_enabled: false,
        reason: "배달권역·배달비·PG/결제 대사 승인 전 판매 불가",
      },
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "상품 가격을 서버에서 확인할 수 없습니다." },
      { status: 503, headers: noStore });
  }
}
