import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { renderPdp } from "@/lib/pdp/generate";
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import type { PdpStructured } from "@/lib/pdp/ruleset";

export const dynamic = "force-dynamic";

/** G3 iterate loop — structured + ConceptSpec → HTML (no LLM) */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid json");
  }

  const structured = b.structured as PdpStructured | undefined;
  if (!structured?.title) return bad("structured required");

  const conceptSpec = b.conceptSpec as ConceptSpec | undefined;
  const assetUrls = Array.isArray(b.assetUrls) ? (b.assetUrls as string[]).filter(Boolean) : [];

  try {
    const html = renderPdp(structured, assetUrls, conceptSpec);
    return NextResponse.json({ ok: true, html });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "render failed", 500);
  }
}
