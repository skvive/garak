import { NextResponse } from "next/server";
import { hqActor, unauthorized, bad } from "@/lib/hq/auth";
import { getState } from "@/lib/hq/store";
import { searchMarketing, classifyText, summarizeLearnings } from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/hq/marketing/search {query?, classify?, summarize?}
 *  - query 있으면 시맨틱 검색(자산 top-K)
 *  - classify 있으면 텍스트 카테고리 분류(최근접 centroid)
 *  - summarize=true 면 학습 원장 centroid 요약
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as {
    query?: string; classify?: string; summarize?: boolean;
  };
  const s = await getState();
  try {
    const out: Record<string, unknown> = {};
    if (body.query) out.results = await searchMarketing(body.query, s, 10);
    if (body.classify) out.categories = await classifyText(body.classify, s);
    if (body.summarize) out.summary = await summarizeLearnings(s, 5);
    return NextResponse.json(out);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "검색 실패", 422);
  }
}
