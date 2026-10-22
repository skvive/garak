import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { processPublishQueue, queuePublish } from "@/lib/hq/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST {channels:string[]} → 큐잉 후 즉시 워커 1회 실행 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json();
  if (!Array.isArray(b.channels) || b.channels.length === 0) return bad("channels[] required");
  try {
    const queued = await queuePublish(Number(id), b.channels, actor);
    const worker = await processPublishQueue();
    return NextResponse.json({ ...queued, worker });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}
