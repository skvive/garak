/**
 * CJ product/list 페이지를 돌며 catalog_index.raw_meta.listedNum 갱신
 * npx tsx scripts/refresh-listed-num.ts
 *   MAX_PAGES=100
 */
import dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();
if (process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
}

import pg from "pg";
import { cjConfigured, cjConnector } from "../src/lib/sourcing/connectors/cjdropshipping";

const MAX_PAGES = Math.min(Number(process.env.MAX_PAGES || 150), 300);
const PAGE_SIZE = 20;

async function main() {
  console.log(`CJ configured=${cjConfigured()} MAX_PAGES=${MAX_PAGES}`);
  if (!cjConfigured()) throw new Error("CJ_API_EMAIL / CJ_API_KEY required");

  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  let updated = 0;
  let seen = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items } = await cjConnector.listCatalogPage!({ page, pageSize: PAGE_SIZE });
    if (!items?.length) {
      console.log(`page ${page}: empty — stop`);
      break;
    }
    seen += items.length;
    for (const it of items) {
      const listed = (it as { listedNum?: number }).listedNum;
      if (listed == null || !Number.isFinite(Number(listed))) continue;
      const r = await client.query(
        `UPDATE catalog_index
         SET raw_meta = COALESCE(raw_meta, '{}'::jsonb) || jsonb_build_object('listedNum', $1::numeric),
             updated_at = NOW()
         WHERE supplier_code = 'cjdropshipping' AND external_id = $2
         RETURNING id`,
        [Number(listed), it.externalId],
      );
      if (r.rowCount) updated += r.rowCount;
    }
    if (page % 10 === 0 || page === 1) {
      console.log(`page ${page}/${MAX_PAGES} seen=${seen} updated=${updated}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const s = await client.query(`
    SELECT count(*) FILTER (WHERE COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric > 0)::int AS with_listed,
           max(COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric) AS max_listed
    FROM catalog_index WHERE supplier_code = 'cjdropshipping'
  `);
  console.log("stats:", s.rows[0], `updatedRows=${updated}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
