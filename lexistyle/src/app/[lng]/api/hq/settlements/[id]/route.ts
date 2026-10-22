import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { confirmSettlement } from "@/lib/hq/services";

export const dynamic = "force-dynamic";

/** PATCH {action:'confirm'} */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await confirmSettlement(Number(id), actor));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}
