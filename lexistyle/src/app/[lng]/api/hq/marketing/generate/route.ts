import { NextResponse } from "next/server";
import { hqActor, unauthorized, bad } from "@/lib/hq/auth";
import { generateMarketingKit } from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

/** POST /api/hq/marketing/generate {listingId} → 훅·카피·카드뉴스·스토리보드 자산 생성 */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { listingId?: number };
  if (!body.listingId) return bad("listingId 필요");
  try {
    const r = await generateMarketingKit(Number(body.listingId), actor);
    return NextResponse.json(r);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "생성 실패", 422);
  }
}
