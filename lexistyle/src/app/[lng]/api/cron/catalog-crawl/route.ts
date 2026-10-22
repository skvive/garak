import { NextResponse } from "next/server";
import { crawlCatalogChunk } from "@/lib/catalog/crawl";
import { processExportQueue } from "@/lib/export/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Catalog crawl chunk + export queue drain */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supplier = new URL(req.url).searchParams.get("supplier") || "cjdropshipping";
  const crawl = await crawlCatalogChunk(supplier);
  const exports = await processExportQueue(15);
  return NextResponse.json({ crawl, exports });
}
