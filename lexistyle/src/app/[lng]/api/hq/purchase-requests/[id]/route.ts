import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { matchPurchaseRequest, vetPurchaseRequest } from "@/lib/hq/services";

export const dynamic = "force-dynamic";

/**
 * PATCH {action:'vet'|'reject'|'refund_delegate', reason?}
 * PATCH {action:'match', channelListingId}
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json();
  try {
    if (b.action === "match") {
      return NextResponse.json(await matchPurchaseRequest(Number(id), Number(b.channelListingId), actor));
    }
    const map = { vet: "vetted", reject: "rejected", refund_delegate: "refund_delegated" } as const;
    const decision = map[b.action as keyof typeof map];
    if (!decision) return bad("unknown action");
    return NextResponse.json(await vetPurchaseRequest(Number(id), decision, actor, b.reason));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}
