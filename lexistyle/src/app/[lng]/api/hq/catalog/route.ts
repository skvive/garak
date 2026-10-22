import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { catalogStats, searchCatalog } from "@/lib/catalog/index-store";

export const dynamic = "force-dynamic";

/** GET /api/hq/catalog?q=&supplier=&category=&lexiBucket=&scope=&importState=&page=&pageSize=50&cursor=&limit=&thumb=1 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const supplier = url.searchParams.get("supplier") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const lexiBucket = url.searchParams.get("lexiBucket") ?? undefined;
  const importState = url.searchParams.get("importState") ?? undefined;
  const scopeParam = url.searchParams.get("scope");
  const scope =
    scopeParam === "all" || scopeParam === "mapped" || scopeParam === "active"
      ? scopeParam
      : undefined;
  const page = Number(url.searchParams.get("page") || 0) || undefined;
  const pageSize = Number(url.searchParams.get("pageSize") || 50) || 50;
  const cursor = Number(url.searchParams.get("cursor") || 0) || undefined;
  const limit = Number(url.searchParams.get("limit") || 40) || 40;
  const includeThumb = url.searchParams.get("thumb") === "1";
  const stockAlertRaw = url.searchParams.get("stockAlert");
  const stockAlert =
    stockAlertRaw === "out" ||
    stockAlertRaw === "low" ||
    stockAlertRaw === "ok" ||
    stockAlertRaw === "unknown"
      ? stockAlertRaw
      : undefined;
  const categories = url.searchParams.get("category")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await searchCatalog({
    q,
    supplier,
    category,
    categories,
    lexiBucket,
    scope,
    importState,
    cursor,
    limit,
    page,
    pageSize,
    includeThumb,
    stockAlert,
  });
  const stats = await catalogStats(supplier);
  return NextResponse.json({ ...result, stats });
}
