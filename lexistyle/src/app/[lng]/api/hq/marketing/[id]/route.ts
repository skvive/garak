import { NextResponse } from "next/server";
import { hqActor, unauthorized, bad } from "@/lib/hq/auth";
import { getState } from "@/lib/hq/store";
import { reviewAsset, publishAsset, recordOutcome } from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

/** GET /api/hq/marketing/[id] → 자산 전체(미리보기 HTML·payload 포함) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id } = await params;
  const s = await getState();
  const a = s.marketingAssets.find((x) => x.id === Number(id));
  if (!a) return bad("not found", 404);
  return NextResponse.json(a);
}

/** PATCH /api/hq/marketing/[id] {action} — approve|reject|publish|outcome */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  const assetId = Number(id);
  const body = (await req.json().catch(() => ({}))) as {
    action?: string; channel?: string; metrics?: { impressions?: number; ctr?: number; cvr?: number }; logId?: number;
  };
  try {
    switch (body.action) {
      case "approve": return NextResponse.json(await reviewAsset(assetId, "approved", actor));
      case "reject": return NextResponse.json(await reviewAsset(assetId, "rejected", actor));
      case "publish": return NextResponse.json(await publishAsset(assetId, body.channel ?? "sns", actor));
      case "outcome":
        if (!body.logId) return bad("logId 필요");
        return NextResponse.json(await recordOutcome(Number(body.logId), body.metrics ?? {}, actor));
      default: return bad("unknown action");
    }
  } catch (e) {
    return bad(e instanceof Error ? e.message : "실패", 422);
  }
}
