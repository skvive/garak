/**
 * Neon catalog → Import → PDP → LEXI export (부서별 N건)
 * npx tsx scripts/seed-storefront-dept-export.ts
 *   PER_DEPT=10 DATABASE_URL=$NEON_DATABASE_URL
 */
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

if (process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
}

import pg from "pg";
import {
  bucketKeysForDepartment,
  departmentOfCategorySlug,
  mapCategorySlug,
  type LexiDept,
} from "../src/lib/catalog/lexi-cj-categories";
import { runImportMany } from "../src/lib/catalog/import";
import { generatePdpForCatalog } from "../src/lib/pdp/generate";
import { enqueueExport, processExportQueue } from "../src/lib/export/jobs";

const PER_DEPT = Math.min(Number(process.env.PER_DEPT || 10), 20);
const DEPTS: LexiDept[] = ["beauty", "fashion", "life", "kids"];

async function pickCatalogIds(): Promise<Record<LexiDept, number[]>> {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL / NEON_DATABASE_URL required");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{
    id: number;
    category_path: string[] | null;
    import_state: string;
  }>(
    `SELECT id, category_path, import_state
     FROM catalog_index
     WHERE source_status != 'gone'
       AND supplier_code = 'cjdropshipping'
       AND COALESCE(import_state, 'none') IN ('none', 'failed')
     ORDER BY id DESC
     LIMIT 8000`,
  );
  await client.end();

  const picked: Record<LexiDept, number[]> = {
    beauty: [],
    fashion: [],
    life: [],
    kids: [],
    others: [],
  };

  for (const r of rows) {
    const bucket = mapCategorySlug(r.category_path ?? []);
    const dept = departmentOfCategorySlug(bucket);
    if (dept === "sourced") continue;
    if (picked[dept].length >= PER_DEPT) continue;
    picked[dept].push(r.id);
  }

  return picked;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  console.log(`PER_DEPT=${PER_DEPT} depts=${DEPTS.join(",")}`);
  const picked = await pickCatalogIds();
  for (const d of DEPTS) {
    console.log(`  ${d}: ${picked[d].length} catalog ids (buckets: ${bucketKeysForDepartment(d).join(", ")})`);
  }

  const allIds = DEPTS.flatMap((d) => picked[d]);
  if (!allIds.length) throw new Error("no catalog candidates");

  console.log(`\n=== Import ${allIds.length} ===`);
  const importResults = await runImportMany(allIds);
  const okImports = importResults.filter((r) => r.ok && "productId" in r && r.productId);
  console.log(`import ok: ${okImports.length}/${allIds.length}`);

  const catalogToDoc: number[] = [];
  for (const r of importResults) {
    const cid = r.catalogId;
    if (!cid) continue;
    console.log(`\nPDP catalog #${cid}…`);
    try {
      const pdp = await generatePdpForCatalog(cid, { locale: "ko" });
      console.log(`  doc #${pdp.documentId}`);
      catalogToDoc.push(pdp.documentId);
    } catch (e) {
      console.error(`  PDP failed #${cid}:`, e instanceof Error ? e.message : e);
    }
  }

  const docIds = [...new Set(catalogToDoc)];
  console.log(`\n=== LEXI export ${docIds.length} docs ===`);
  for (const documentId of docIds) {
    const jobs = await enqueueExport({ documentId, channels: ["lexi"] });
    console.log(`  enqueue doc #${documentId} → ${jobs.length} job(s)`);
    const processed = await processExportQueue(5);
    for (const p of processed) {
      console.log(
        `    job #${p.id} ok=${p.ok} ref=${(p as { externalRef?: string }).externalRef ?? "-"} err=${(p as { error?: string }).error ?? ""}`,
      );
    }
  }

  // verify counts by bucket
  const url = process.env.DATABASE_URL!;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows: counts } = await client.query<{ slug: string; cnt: number }>(
    `SELECT c.slug, count(p.id)::int AS cnt
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_dummy = false AND p.deleted_at IS NULL
     GROUP BY c.slug
     ORDER BY cnt DESC`,
  );
  await client.end();

  console.log("\n=== Storefront product counts ===");
  for (const r of counts) {
    if (r.cnt > 0) console.log(`  ${r.slug}: ${r.cnt}`);
  }
  console.log("\ndone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
