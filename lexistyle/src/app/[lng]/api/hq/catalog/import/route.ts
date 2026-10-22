import { NextResponse } from "next/server";
import { runImportJob, runImportMany } from "@/lib/catalog/import";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { catalogId } | { catalogIds: number[] } */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as { catalogId?: number; catalogIds?: number[] };
    if (body.catalogIds?.length) {
      return NextResponse.json({ results: await runImportMany(body.catalogIds) });
    }
    if (!body.catalogId) return bad("catalogId required");
    return NextResponse.json(await runImportJob(body.catalogId));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "import failed", 500);
  }
}
