/**
 * Approved GARAK seller products only.
 * GET /api/garak-order/products?sku=GYS-011 (optional SKU filter)
 */
import { NextResponse } from "next/server";
import { readyGarakProducts } from "@/lib/garak-order/ready-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, private" };

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const sku = params.get("sku");
  if (sku !== null && !/^GYS-[0-9]{3}$/.test(sku)) {
    return NextResponse.json({ error: "invalid sku" }, { status: 400, headers: noStore });
  }
  try {
    const products = await readyGarakProducts(sku ? [sku] : undefined);
    if (sku && products.length !== 1) {
      return NextResponse.json({ error: "상품이 판매 승인되지 않았거나 품절입니다." },
        { status: 404, headers: noStore });
    }
    return NextResponse.json({
      data: sku ? products[0] : { items: products },
      source: "garak_partner_products",
      currency: "KRW",
      checkout_enabled: false,
      serviceability_verified: false,
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "승인 상품 카탈로그를 조회할 수 없습니다." },
      { status: 503, headers: noStore });
  }
}
