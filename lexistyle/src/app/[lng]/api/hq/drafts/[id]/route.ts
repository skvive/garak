import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { reviewDraft } from "@/lib/hq/services";

export const dynamic = "force-dynamic";

/** PATCH {decision:'approved'|'rejected', marginPolicy?} — 승인 시 listing 생성 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json();
  if (b.decision !== "approved" && b.decision !== "rejected") return bad("decision required");
  try {
    return NextResponse.json(await reviewDraft(Number(id), b.decision, actor, b.marginPolicy));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}
