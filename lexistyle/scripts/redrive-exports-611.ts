/**
 * Redrive LEXI exports for all 611 products upserted by export-top40-by-bucket.
 * Finds existing PDP docs per catalog_id, purges failed export jobs, and re-enqueues.
 *
 * $env:DATABASE_URL = $env:NEON_DATABASE_URL
 * npx tsx scripts/redrive-exports-611.ts
 */
import dotenv from "node:path";
import fs from "node:fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();
if (process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
}

import pg from "pg";
import { computeSellPrice } from "../src/lib/hq/types";
import { enqueueExport, processExportQueue } from "../src/lib/export/jobs";
import { resolveCjExportOptions } from "../src/lib/catalog/cj-options";

const LOG = path.join(process.cwd(), "scripts", "redrive-exports-611.log");

function log(line: string) {
  console.log(line);
  fs.appendFileSync(LOG, `${line}\n`);
}

async function purgeFailedExports(docIds: number[]) {
  const url = process.env.DATABASE_URL!;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const docId of docIds) {
      await client.query(
        `DELETE FROM export_jobs WHERE status = 'failed' AND document_id = $1`,
        [docId],
      );
    }
  } finally {
    await client.end();
  }
}

async function main() {
  fs.writeFileSync(LOG, `# redrive-exports-611 ${new Date().toISOString()}\n`);
  const url = process.env.DATABASE_URL!;

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  // Map: catalog_id -> { productId, slug, priceUsd, title, categoryId }
  // Also join studio_documents to find PDP doc IDs by catalog_id
  const { rows } = await client.query<{
    id: string;
    slug: string;
    name: string;
    price_usd: string;
    category_id: string;
    catalog_id: string;
    pdp_doc_id: string;
  }>(
    `SELECT p.id, p.slug, p.name, p.price_usd, p.category_id, ci.id as catalog_id,
            sd.id as pdp_doc_id
     FROM products p
     JOIN catalog_index ci ON ci.product_id = p.id
     LEFT JOIN studio_documents sd ON sd.kind = 'pdp'
       AND sd.body->>'catalogId'::text = ci.id
     WHERE p.is_dummy = false AND p.deleted_at IS NULL
       AND ci.import_state = 'imported'
     ORDER BY p.id`,
  );

  log(`Found ${rows.length} imported products (some may lack PDP doc IDs)`);

  const withDocIds = rows.filter((r) => r.pdp_doc_id != null && Number(r.pdp_doc_id) > 0);
  const withoutDocs = rows.filter((r) => r.pdp_doc_id == null || Number(r.pdp_doc_id) === 0);

  log(`  with PDP docs: ${withDocIds.length}`);
  log(`  without PDP docs: ${withoutDocs.length}`);

  if (rows.length === 0) {
    log("Nothing to do.");
    await client.end();
    return;
  }

  // Step 1: Purge failed exports for all doc IDs
  const docIds = withDocIds.map((r) => Number(r.pdp_doc_id));
  if (docIds.length > 0) {
    log(`Purging failed exports for ${docIds.length} PDP docs...`);
    await purgeFailedExports(docIds);
    log("Done purging.");
  }

  let done = 0;
  let exportOk = 0;
  let exportFail = 0;
  let skippedNoDoc = 0;

  for (const row of rows) {
    done++;
    const pct = Math.round((done / rows.length) * 100);
    const catId = Number(row.catalog_id);
    const sell = computeSellPrice(Number(row.price_usd));
    log(`[${done}/${rows.length} ${pct}%] #${row.id} ${row.name.slice(0, 40)} catId=${catId} sell=$${sell}`);

    if (!row.pdp_doc_id || Number(row.pdp_doc_id) === 0) {
      log(`  SKIPPED — no PDP doc`);
      skippedNoDoc++;
      continue;
    }

    // Try to load CJ options (short timeout)
    let options = undefined;
    try {
      options = (await Promise.race([
        resolveCjExportOptions(catId),
        new Promise<undefined>((_, rej) => setTimeout(() => rej(new Error("cj-options-timeout")), 6_000)),
      ])) as typeof options;
    } catch {
      /* proceed without options */
    }

    try {
      const jobs = await enqueueExport({
        documentId: Number(row.pdp_doc_id),
        channels: ["lexi"],
        options,
        pricing: { sellPriceUsd: sell },
      });

      // Process immediately
      const processed = await processExportQueue(4);
      for (const p of processed) {
        if (p.ok) exportOk++;
        else exportFail++;
      }

      log(`  exported ok=${exportOk} fail=${exportFail}`);
    } catch (e) {
      exportFail++;
      log(`  ERROR: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Drain remaining queue
  for (let i = 0; i < 30; i++) {
    const processed = await processExportQueue(20);
    if (!processed.length) break;
    for (const p of processed) {
      if (p.ok) exportOk++;
      else exportFail++;
    }
  }

  // Show final counts per category
  const { rows: counts } = await client.query<{ slug: string; cnt: string }>(
    `SELECT c.slug, count(p.id)::text AS cnt
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_dummy = false AND p.deleted_at IS NULL
     GROUP BY c.slug
     ORDER BY count(p.id) DESC`,
  );
  await client.end();

  log("\n=== Storefront product counts ===");
  for (const r of counts) log(`  ${r.slug}: ${r.cnt}`);
  log(`\nexportOk=${exportOk} exportFail=${exportFail} skippedNoDoc=${skippedNoDoc}`);
  log("redrive complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
