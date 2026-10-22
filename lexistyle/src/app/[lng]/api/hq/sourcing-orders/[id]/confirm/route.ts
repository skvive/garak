import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { confirmSourcingOrder } from "@/lib/hq/cj-order-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — CJ 장바구니 담기·확정 (CREATED/IN_CART → UNPAID), 결제 없음 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await confirmSourcingOrder(Number(id), actor));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "confirm failed", 422);
  }
}
