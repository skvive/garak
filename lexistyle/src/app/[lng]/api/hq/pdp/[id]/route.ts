import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getCatalogById } from "@/lib/catalog/index-store";
import { getPdpDocument, updatePdpDocument } from "@/lib/pdp/generate";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id } = await ctx.params;
  const doc = await getPdpDocument(Number(id));
  if (!doc) return bad("not found", 404);
  const body = (doc.body ?? {}) as { catalogId?: number };
  const catalogId = (doc as { catalogId?: number }).catalogId ?? body.catalogId;
  let catalog: { id: number; categoryPath: string[] | null } | null = null;
  if (catalogId) {
    const row = await getCatalogById(catalogId);
    if (row) catalog = { id: row.id, categoryPath: row.categoryPath ?? null };
  }
  return NextResponse.json({ document: doc, catalog });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const doc = await updatePdpDocument(Number(id), body);
    return NextResponse.json({ document: doc });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "patch failed", 400);
  }
}
