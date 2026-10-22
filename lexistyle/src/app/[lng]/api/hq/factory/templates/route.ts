import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { createTemplate, listTemplates } from "@/lib/factory/store";
import type { GoldenTemplate } from "@/lib/factory/types";

export const dynamic = "force-dynamic";

/** 골든 템플릿 목록 / 저장 — 스튜디오 산출물이자 공장 입력 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json({ templates: listTemplates() });
}

export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let body: Partial<GoldenTemplate>;
  try {
    body = (await req.json()) as Partial<GoldenTemplate>;
  } catch {
    return bad("invalid json");
  }
  if (!body.name?.trim()) return bad("name required");
  const template = createTemplate({
    name: body.name.trim(),
    createdFromPrompt: body.createdFromPrompt,
    tokens: body.tokens,
    blockPlan: body.blockPlan,
    imageRecipe: body.imageRecipe,
    copyRuleset: body.copyRuleset,
    channelTargets: body.channelTargets,
    conceptSpec: body.conceptSpec,
    locked: false,
  });
  return NextResponse.json({ ok: true, template });
}
