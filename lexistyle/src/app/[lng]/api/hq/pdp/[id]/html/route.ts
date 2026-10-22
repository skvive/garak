import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { getPdpDocument } from "@/lib/pdp/generate";

export const dynamic = "force-dynamic";

/** GET /api/hq/pdp/:id/html — 문서 renderedHtml 조회 (미리보기 팝업/탭용) */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id } = await ctx.params;
  const doc = await getPdpDocument(Number(id));
  if (!doc) return NextResponse.json({ error: "document not found" }, { status: 404 });
  return NextResponse.json({
    id: (doc as { id: number }).id,
    title: (doc as { title: string }).title,
    html: (doc as { renderedHtml?: string | null }).renderedHtml ?? "",
  });
}