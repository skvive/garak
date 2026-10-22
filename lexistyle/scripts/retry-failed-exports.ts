/**
 * Failed export_jobs → retry → processExportQueue (Neon / local)
 * npx tsx scripts/retry-failed-exports.ts
 *   CHANNEL=lexi LIMIT=50 DATABASE_URL=$NEON_DATABASE_URL
 */
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

if (process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
}

import pg from "pg";
import { processExportQueue } from "../src/lib/export/jobs";

const CHANNEL = process.env.CHANNEL || "lexi";
const BATCH = Math.min(Number(process.env.LIMIT || 20), 100);
const MAX_ROUNDS = Math.min(Number(process.env.MAX_ROUNDS || 30), 100);

async function main() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const { rows: before } = await client.query<{ status: string; cnt: string }>(
    `SELECT status, count(*)::text AS cnt FROM export_jobs WHERE channel_code = $1 GROUP BY status ORDER BY status`,
    [CHANNEL],
  );
  console.log(`=== export_jobs (${CHANNEL}) before ===`);
  for (const r of before) console.log(`  ${r.status}: ${r.cnt}`);

  const { rowCount } = await client.query(
    `UPDATE export_jobs
     SET status = 'retry',
         attempt_count = 0,
         last_error = NULL,
         next_attempt_at = NULL,
         completed_at = NULL
     WHERE channel_code = $1 AND status = 'failed'`,
    [CHANNEL],
  );
  console.log(`\nrequeued failed: ${rowCount ?? 0}`);

  await client.end();

  let totalOk = 0;
  let totalFail = 0;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const processed = await processExportQueue(BATCH);
    if (!processed.length) break;
    const ok = processed.filter((p) => p.ok).length;
    const fail = processed.length - ok;
    totalOk += ok;
    totalFail += fail;
    console.log(`round ${round}: processed=${processed.length} ok=${ok} fail=${fail}`);
    for (const p of processed.filter((x) => !x.ok).slice(0, 3)) {
      console.log(`  fail #${p.id}: ${(p as { error?: string }).error?.slice(0, 120) ?? "?"}`);
    }
  }

  const client2 = new pg.Client({ connectionString: url });
  await client2.connect();
  const { rows: after } = await client2.query<{ status: string; cnt: string }>(
    `SELECT status, count(*)::text AS cnt FROM export_jobs WHERE channel_code = $1 GROUP BY status ORDER BY status`,
    [CHANNEL],
  );
  console.log(`\n=== after (ok=${totalOk} fail=${totalFail}) ===`);
  for (const r of after) console.log(`  ${r.status}: ${r.cnt}`);

  const { rows: pdpSlugs } = await client2.query<{ cnt: string }>(
    `SELECT count(*)::text AS cnt FROM products WHERE slug LIKE 'lexi-pdp-%' AND deleted_at IS NULL`,
  );
  const { rows: withDesc } = await client2.query<{ cnt: string }>(
    `SELECT count(*)::text AS cnt FROM products WHERE deleted_at IS NULL AND is_dummy = false AND description IS NOT NULL AND length(description) > 20`,
  );
  await client2.end();

  console.log(`lexi-pdp products: ${pdpSlugs[0]?.cnt ?? 0}`);
  console.log(`products with PDP description: ${withDesc[0]?.cnt ?? 0}`);
  console.log(`\ndone. export ok=${totalOk} fail=${totalFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
