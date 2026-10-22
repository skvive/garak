import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getTemplate, updateTemplate } from "@/lib/factory/store";
import { patchConceptFromChat, type ConceptSpec } from "@/lib/pdp/concept-spec";

export const dynamic = "force-dynamic";

/** 골든 템플릿 패치 — ConceptSpec 채팅·잠금 (Phase B) */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return bad("invalid id");

  const template = getTemplate(id);
  if (!template) return bad("template not found", 404);

  let body: { lock?: boolean; chat?: string; conceptSpec?: Partial<ConceptSpec> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("invalid json");
  }

  let conceptSpec = template.conceptSpec ?? {
    layoutId: "editorial-fullbleed" as const,
    tokens: template.tokens,
    blockPlan: template.blockPlan,
    voice: template.createdFromPrompt,
    copyRuleset: template.copyRuleset,
    imageRecipe: template.imageRecipe,
  };

  if (body.chat?.trim()) {
    conceptSpec = patchConceptFromChat(conceptSpec, body.chat.trim());
  }
  if (body.conceptSpec) {
    conceptSpec = { ...conceptSpec, ...body.conceptSpec };
  }

  const patch: Parameters<typeof updateTemplate>[1] = {
    conceptSpec,
    tokens: conceptSpec.tokens ?? template.tokens,
    blockPlan: conceptSpec.blockPlan ?? template.blockPlan,
    imageRecipe: conceptSpec.imageRecipe ?? template.imageRecipe,
    copyRuleset: conceptSpec.copyRuleset ?? template.copyRuleset,
    createdFromPrompt: conceptSpec.voice ?? template.createdFromPrompt,
  };

  if (body.lock === true) {
    patch.locked = true;
    patch.lockedAt = new Date().toISOString();
  } else if (body.lock === false) {
    patch.locked = false;
    patch.lockedAt = undefined;
  }

  const updated = updateTemplate(id, patch);
  return NextResponse.json({ ok: true, template: updated });
}
