import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { renderPdp } from "@/lib/pdp/generate";
import { revisePdpWithAI } from "@/lib/pdp/revise";
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import type { PdpStructured } from "@/lib/pdp/ruleset";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 스튜디오 "수정": 현재 PDP 문구 + 운영자 지시 → AI 교정본 + 렌더 HTML */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid json");
  }
  const structured = b.structured as PdpStructured | undefined;
  const instruction = typeof b.instruction === "string" ? b.instruction.trim() : "";
  if (!structured?.title) return bad("structured required");
  if (!instruction) return bad("instruction required");
  const conceptSpec = b.conceptSpec as ConceptSpec | undefined;
  const assetUrls = Array.isArray(b.assetUrls) ? (b.assetUrls as string[]).filter(Boolean) : [];

  try {
    const { doc, engine, model } = await revisePdpWithAI({
      structured,
      instruction,
      locale: conceptSpec?.locale,
    });
    return NextResponse.json({ ok: true, structured: doc, html: renderPdp(doc, assetUrls, conceptSpec), engine, model });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "revise failed", 502);
  }
}
