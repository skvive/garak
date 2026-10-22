import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { publishPdpToStorefront } from "@/lib/pdp/publish";

export const dynamic = "force-dynamic";

/** 출력: 저장된 PDP 문서를 쇼핑몰 상품페이지에 반영 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) return bad("invalid id");
  try {
    const { slug } = await publishPdpToStorefront(id, actor);
    return NextResponse.json({ ok: true, slug, url: `/ko/product/${slug}` });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "publish failed", 409);
  }
}
