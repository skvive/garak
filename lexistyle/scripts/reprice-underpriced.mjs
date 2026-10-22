/**
 * 원가 이하·원가 수준으로 진열된 상품을 LEXI 판매가 정책으로 재가격한다.
 * 정책(src/lib/hq/types.ts computeSellPrice): (CJ 원가 + $20) × 1.3, 끝자리 x.9
 * 원가 = catalog_index.min_price (pid = slug 끝 숫자). 정책가보다 낮은 상품만 올리고 높은 상품은 그대로 둔다.
 *
 *   node scripts/reprice-underpriced.mjs --target=neon [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { mkdirSync, writeFileSync } from "fs";
import pg from "pg";

const SOURCING_FEE = 20;
const MARKUP_RATE = 1.3;
const sellPrice = (cost) => +(Math.ceil((cost + SOURCING_FEE) * MARKUP_RATE) - 0.1).toFixed(2);

const args = process.argv.slice(2);
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "neon";
const dry = args.includes("--dry-run");
const url = target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await client.connect();

const rows = (
  await client.query(`
    select p.id::int, p.slug, p.name, p.price_usd::float as price, ci.min_price::float as cost
    from products p
    left join catalog_index ci on ci.supplier_code = 'cjdropshipping'
      and ci.external_id = substring(p.slug from '([0-9]{15,25})$')
    where p.deleted_at is null`)
).rows;

mkdirSync("tmp/backup", { recursive: true });
writeFileSync(`tmp/backup/prices-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify(rows.map((r) => ({ id: r.id, slug: r.slug, price: r.price }))));

const changes = [];
let noCost = 0;
for (const r of rows) {
  if (!(r.cost > 0)) { noCost++; continue; }
  const target = sellPrice(r.cost);
  if (r.price < target - 0.005) changes.push({ ...r, to: target });
}
console.log(`target=${target} live=${rows.length} no-cost=${noCost} to-reprice=${changes.length}${dry ? " (dry-run)" : ""}`);
for (const c of changes.slice(0, 8)) console.log(`  ${c.price} -> ${c.to} (cost ${c.cost}) ${c.name.slice(0, 50)}`);

if (!dry && changes.length) {
  await client.query("begin");
  for (const c of changes) await client.query("update products set price_usd = $2 where id = $1", [c.id, String(c.to)]);
  await client.query("commit");
  const left = changes.filter(() => false).length;
  console.log("repriced", changes.length, left);
}
await client.end();
