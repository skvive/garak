import { NextResponse } from "next/server";
import { crawlCatalogChunk } from "@/lib/catalog/crawl";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { supplierCode, reset?, pages? } — checkpoint crawl 청크 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as { supplierCode?: string; reset?: boolean; pages?: number };
    if (!body.supplierCode) return bad("supplierCode required");
    const result = await crawlCatalogChunk(body.supplierCode, {
      reset: body.reset,
      pages: body.pages,
    });
    return NextResponse.json(result);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "crawl failed", 500);
  }
}
