/**
 * products.rating_avg / review_count 시드값(4.5점·12개 등)을 실제 reviews 테이블 집계로 되돌린다.
 *   node scripts/reset-seeded-ratings.mjs --target=neon|local
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { mkdirSync, writeFileSync } from "fs";
import pg from "pg";
const target = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "neon";
const c = new pg.Client({ connectionString: target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await c.connect();
const before = (await c.query("select id::int, rating_avg, review_count from products")).rows;
mkdirSync("tmp/backup", { recursive: true });
writeFileSync(`tmp/backup/ratings-${target}-${Date.now()}.json`, JSON.stringify(before));
const r = await c.query(`
  update products p set
    review_count = coalesce(x.n, 0),
    rating_avg = x.avg
  from (select p2.id, (select count(*) from reviews r where r.product_id = p2.id)::int as n,
               (select round(avg(r.rating)::numeric, 1) from reviews r where r.product_id = p2.id) as avg
        from products p2) x
  where x.id = p.id`);
const after = (await c.query("select count(*) filter (where review_count > 0)::int with_reviews, count(*)::int total from products")).rows[0];
console.log(`target=${target} updated=${r.rowCount}`, JSON.stringify(after));
await c.end();
