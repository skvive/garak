import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { runFactoryBatch, type FactoryRunInput } from "@/lib/factory/engine";
import { listBatches } from "@/lib/factory/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 배치 이력 조회 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json({ batches: listBatches() });
}

/**
 * 페이지 공장 배치 실행 — 골든 템플릿 × 상품 목록 병렬 팬아웃 생성.
 * POST { templateId?, catalogIds:number[], concurrency?, maxAttempts?, locale?, skipExisting? }
 *
 * 주의: v1은 요청 내에서 완료까지 실행하므로 대량 배치는 catalogIds를 청크로 나눠
 * 반복 호출하거나(권장), 백그라운드 잡으로 이관해야 한다(후속).
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let body: FactoryRunInput;
  try {
    body = (await req.json()) as FactoryRunInput;
  } catch {
    return bad("invalid json");
  }
  if (!Array.isArray(body.catalogIds) || body.catalogIds.length === 0) {
    return bad("catalogIds[] required");
  }
  if (body.catalogIds.length > 200) {
    return bad("batch too large — chunk catalogIds to <=200 per call", 413);
  }
  try {
    const batch = await runFactoryBatch(body);
    return NextResponse.json({ ok: true, batch });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "factory run failed", 500);
  }
}
