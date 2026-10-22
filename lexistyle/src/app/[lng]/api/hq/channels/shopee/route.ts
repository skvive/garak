import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getShopeeHealthSnapshot, probeShopeeHealth } from "@/lib/channels/shopee/health";
import { syncShopeeStockFromCatalog } from "@/lib/channels/adapters/shopee";
import { getCatalogByIds, searchCatalog } from "@/lib/catalog/index-store";

export const dynamic = "force-dynamic";

/** GET ?probe=1 — health snapshot or live probe (S1) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const health = probe ? await probeShopeeHealth() : getShopeeHealthSnapshot();
  return NextResponse.json(health);
}

/** POST { action: 'sync-stock', catalogIds?: number[] } — Phase C */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let body: { action?: string; catalogIds?: number[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("invalid json");
  }
  if (body.action !== "sync-stock") return bad("action sync-stock required");

  const idsRaw =
    body.catalogIds?.length
      ? body.catalogIds
      : (await searchCatalog({ supplier: "cjdropshipping", importState: "imported", limit: 100 })).items.map((r) => r.id);
  const ids = idsRaw.slice(0, 50);

  let ok = 0;
  const errors: { catalogId: number; error: string }[] = [];
  for (const catalogId of ids) {
    try {
      const row = (await getCatalogByIds([catalogId]))[0];
      if (!row) continue;
      const r = await syncShopeeStockFromCatalog(catalogId, row.stock);
      if (r.ok) ok++;
      else errors.push({ catalogId, error: r.reason ?? "skip" });
    } catch (e) {
      errors.push({ catalogId, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ ok, total: ids.length, errors: errors.slice(0, 20) });
}
