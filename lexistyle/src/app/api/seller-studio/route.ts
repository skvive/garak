import { NextResponse } from "next/server";
import { studioActor } from "@/lib/seller-studio/auth";
import { checkMutationOrigin } from "@/lib/seller-studio/security";
import { perform, snapshot, searchLocalCatalog } from "@/lib/seller-studio/service";
import { StudioError } from "@/lib/seller-studio/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
function failure(e: unknown) {
  return NextResponse.json({ error: e instanceof StudioError ? e.message : "처리하지 못했습니다. 연결 설정·입력 형식을 확인하세요. 기존 데이터는 유지됩니다." }, { status: e instanceof StudioError ? e.status : 500 });
}
export async function GET(req: Request) {
  try {
    const actor = await studioActor(req);
    const query = new URL(req.url).searchParams.get("catalog");
    return NextResponse.json(query !== null ? await searchLocalCatalog(actor, query.slice(0, 100)) : await snapshot(actor), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return failure(e); }
}
export async function POST(req: Request) {
  try {
    checkMutationOrigin(req);
    const actor = await studioActor(req);
    if (!req.headers.get("content-type")?.includes("application/json")) throw new StudioError("JSON 요청이 필요합니다.", 415);
    const text = await req.text();
    if (Buffer.byteLength(text) > 1_500_000) throw new StudioError("요청은 1.5MB 이하여야 합니다.", 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new StudioError("JSON 형식이 올바르지 않습니다."); }
    return NextResponse.json(await perform(actor, body));
  } catch (e) { return failure(e); }
}
