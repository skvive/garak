// filepath: src/app/api/cart/route.ts
import { NextResponse } from "next/server";
import { readCart, setCartItem } from "@/lib/cart-store";
import { findStorefrontOption, getStorefrontOptions } from "@/lib/pdp/storefront-options";

export async function GET() {
  const items = await readCart();
  const subtotal = +items.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
  return NextResponse.json({ items, subtotal, count: items.reduce((s, l) => s + l.qty, 0) });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { slug?: string; qty?: number; sku?: string };
  if (!body.slug || typeof body.qty !== "number") {
    return NextResponse.json({ error: "slug and qty required" }, { status: 400 });
  }
  try {
    // 옵션 상품은 서버에서 sku를 검증하고 라벨도 서버 값으로 확정 (위조 sku로 오발주 방지)
    let variant: { sku: string; label: string } | undefined;
    if (body.sku) {
      const opt = await findStorefrontOption(body.slug, body.sku);
      if (!opt) return NextResponse.json({ error: "유효하지 않은 옵션입니다" }, { status: 400 });
      variant = { sku: opt.sku, label: opt.label };
    } else if (body.qty > 0 && (await getStorefrontOptions(body.slug)).length) {
      return NextResponse.json({ error: "옵션(컬러·사이즈)을 선택해 주세요" }, { status: 400 });
    }
    const items = await setCartItem(body.slug, body.qty, variant);
    const subtotal = +items.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
    return NextResponse.json({ items, subtotal, count: items.reduce((s, l) => s + l.qty, 0) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
