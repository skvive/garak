import { NextResponse } from "next/server";
import { readCart, setCartItem } from "@/lib/cart-store";
import { readLook } from "@/lib/looks/store";
import { lookCatalog } from "@/lib/looks/catalog";
import { effectiveSlots } from "@/lib/looks/dressable";
import { selectItems, validateSlots } from "@/lib/looks/validation";
import { checkOrigin } from "@/lib/looks/photo";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const look = await readLook();
    const items = selectItems(validateSlots(effectiveSlots(look.slots)), await lookCatalog());
    if (!items.length) return NextResponse.json({ error: "먼저 상품을 선택해 주세요." }, { status: 400 });
    const existing = new Map((await readCart()).map(l => [l.slug, l.qty]));
    let count = 0;
    for (const item of items) { await setCartItem(item.slug, Math.max(existing.get(item.slug) ?? 0, 1)); count++; }
    return NextResponse.json({ ok: true, count });
  } catch { return NextResponse.json({ error: "일부 상품을 담지 못했습니다. 장바구니를 확인해 주세요." }, { status: 400 }); }
}
