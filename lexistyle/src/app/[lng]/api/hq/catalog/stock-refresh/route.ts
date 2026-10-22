import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getCatalogByIds, updateCatalogStock } from "@/lib/catalog/index-store";
import { queryCjProductStock } from "@/lib/sourcing/connectors/cjdropshipping";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { catalogIds: number[] } — 공개 카탈로그 창고 재고 갱신 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const ids = Array.isArray(b.catalogIds) ? b.catalogIds.map(Number).filter(Boolean).slice(0, 40) : [];
  if (!ids.length) return bad("catalogIds required");
  const rows = await getCatalogByIds(ids);
  let updated = 0;
  for (const row of rows) {
    if (row.supplierCode !== "cjdropshipping") continue;
    const inv = await queryCjProductStock(row.externalId).catch(() => null);
    if (!inv) continue;
    await updateCatalogStock(row.id, inv.stock, inv.warehouses, inv.verified);
    updated++;
  }
  return NextResponse.json({ updated, checked: rows.length });
}
