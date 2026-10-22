import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { paySourcingOrder } from "@/lib/hq/cj-order-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — CJ 잔액결제 (UNPAID → payBalanceV2) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await paySourcingOrder(Number(id), actor));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "pay failed", 422);
  }
}
