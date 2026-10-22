import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { pullChannelOrders } from "@/lib/hq/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — 채널 주문 pull (쿠팡 ordersheets 폴링 / 목업 데모 주문) */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { code } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { orderId?: string };
  try {
    return NextResponse.json(await pullChannelOrders(code, { externalOrderId: body.orderId?.trim() || undefined }));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "pull failed", 422);
  }
}
