import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { catalogIndex } from "@/db/schema";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { runImportMany } from "@/lib/catalog/import";
import {
  LEXI_CJ_BUCKETS,
  activeImportCjChips,
  bucketByKey,
} from "@/lib/catalog/lexi-cj-categories";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/hq/catalog/import-scope
 * 취급 버킷(기본 active 7)의 import_state=none 을 limit개씩 Import.
 * body: { limit?: number, lexiBuckets?: string[], batchSize?: number }
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  if (!hasDb()) return bad("DATABASE_URL required", 503);

  const body = (await req.json().catch(() => ({}))) as {
    limit?: number;
    lexiBuckets?: string[];
    batchSize?: number;
  };
  const limit = Math.min(Math.max(Number(body.limit) || 12, 1), 24);
  const keys = body.lexiBuckets?.length
    ? body.lexiBuckets
    : LEXI_CJ_BUCKETS.filter((b) => b.activeImport).map((b) => b.key);

  const chips = keys.flatMap((k) => bucketByKey(k)?.cjChips ?? []);
  const chipSet = chips.length ? chips : activeImportCjChips();
  if (!chipSet.length) return bad("no chips in scope");

  const rows = await db()
    .select({ id: catalogIndex.id })
    .from(catalogIndex)
    .where(
      and(
        eq(catalogIndex.supplierCode, "cjdropshipping"),
        eq(catalogIndex.importState, "none"),
        sql`${catalogIndex.categoryPath}[1] IN (${sql.join(
          chipSet.map((c) => sql`${c}`),
          sql`, `,
        )})`,
      ),
    )
    .orderBy(catalogIndex.id)
    .limit(limit);

  const ids = rows.map((r) => r.id);
  if (!ids.length) {
    return NextResponse.json({ ok: true, imported: 0, remainingHint: 0, results: [] });
  }

  const results = await runImportMany(ids);
  const ok = results.filter((r) => (r as { ok?: boolean }).ok).length;
  return NextResponse.json({
    ok: true,
    requested: ids.length,
    imported: ok,
    failed: ids.length - ok,
    catalogIds: ids,
    results,
  });
}
