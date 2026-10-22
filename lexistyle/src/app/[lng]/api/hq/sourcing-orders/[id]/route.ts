import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { advanceSourcingOrder } from "@/lib/hq/services";
import { mutate } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

/** PATCH {to?, trackingNo?, undelivered?} */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json();
  try {
    if (typeof b.undelivered === "boolean" && !b.to) {
      const so = await mutate((s) => {
        const row = s.sourcingOrders.find((o) => o.id === Number(id));
        if (!row) throw new Error("sourcing order not found");
        row.undelivered = b.undelivered;
        return row;
      });
      return NextResponse.json(so);
    }
    if (!b.to) return bad("to required");
    return NextResponse.json(await advanceSourcingOrder(Number(id), String(b.to), actor, b));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}
