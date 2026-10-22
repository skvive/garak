import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lookCatalog } from "@/lib/looks/catalog";
import { readLook, writeLook, LOOK_COOKIE } from "@/lib/looks/store";
import { validateSlots, selectItems } from "@/lib/looks/validation";
import { checkOrigin } from "@/lib/looks/photo";
import type { SavedLook, LookSlots } from "@/lib/looks/types";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const catalog = await lookCatalog();
    const current = await readLook();
    const slots: LookSlots = {};
    const saved = (await cookies()).has(LOOK_COOKIE);
    if (saved) {
      for (const item of catalog) if (current.slots[item.slot] === item.slug) slots[item.slot] = item.slug;
      if (slots.dress) { delete slots.top; delete slots.bottom; }
    }
    const look = { ...current, title: "나의 룩북", slots };
    return NextResponse.json({ look, items: selectItems(slots, catalog), catalog }, { headers });
  } catch { return NextResponse.json({ error: "상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503, headers }); }
}
export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const body = await req.json() as Partial<SavedLook>;
    const slots = validateSlots(body.slots);
    const catalog = await lookCatalog();
    const items = selectItems(slots, catalog);
    const look = await writeLook({ id: "my-look", title: typeof body.title === "string" ? body.title.slice(0, 60) : "나의 룩북", occasion: typeof body.occasion === "string" ? body.occasion.slice(0, 40) : "일상", slots, updatedAt: "" });
    return NextResponse.json({ look, items, catalog }, { headers });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && /[가-힣]/.test(e.message) ? e.message : "상품 구성을 저장하지 못했습니다." }, { status: 400, headers }); }
}
