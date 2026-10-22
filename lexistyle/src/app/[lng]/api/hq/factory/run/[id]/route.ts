import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getBatch } from "@/lib/factory/store";

export const dynamic = "force-dynamic";

/** 단일 배치 진행/결과 조회 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id } = await ctx.params;
  const batch = getBatch(Number(id));
  if (!batch) return bad("batch not found", 404);
  return NextResponse.json({ batch });
}
