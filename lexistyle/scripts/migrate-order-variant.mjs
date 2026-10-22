// cart_items / order_items 에 공급처 옵션 SKU(CJ vid)·라벨 컬럼 추가 (nullable — 기존 행·dbd 영향 없음)
// usage: node scripts/migrate-order-variant.mjs [local|neon]
import { config } from "dotenv";
import pg from "pg";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const target = process.argv[2] ?? "local";
const url = target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL;
if (!url) throw new Error(`${target} DB URL 없음`);
const c = new pg.Client({ connectionString: url, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await c.connect();
for (const t of ["cart_items", "order_items"]) {
  await c.query(`alter table ${t} add column if not exists variant_sku text, add column if not exists variant_label text`);
}
const cols = await c.query(
  `select table_name, column_name from information_schema.columns where table_name in ('cart_items','order_items') and column_name like 'variant_%' order by 1,2`,
);
console.log(target, JSON.stringify(cols.rows));
await c.end();
