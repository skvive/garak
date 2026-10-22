/**
 * Neon catalog_index의 CJ leaf별 상품 수 분포 조회 (읽기 전용)
 * npx tsx scripts/check-neon-leaf-dist.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || "";

import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  const d = db();
  const res = await d.execute(sql`
    select (category_path)[1] as leaf, count(*)::int as n
    from catalog_index
    where supplier_code = 'cjdropshipping' and source_status <> 'gone'
    group by 1 order by n desc
  `);
  const rows = res.rows as { leaf: string; n: number }[];
  console.log("Neon 총 leaf:", rows.length, "/* 상위 80 */");
  for (const r of rows.slice(0, 80)) {
    console.log(`${String(r.n).padStart(5)} | ${r.leaf}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});