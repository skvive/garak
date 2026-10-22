import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";
import {
  STOREFRONT_BUCKET_ORDER,
  mapCategorySlug,
  departmentOfCategorySlug,
  type LexiDept,
} from "../src/lib/catalog/lexi-cj-categories.ts";

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const c = new pg.Client({ connectionString: url });
await c.connect();

const keys = await c.query(`
  SELECT k, count(*)::int AS n
  FROM catalog_index,
    LATERAL jsonb_object_keys(COALESCE(raw_meta, '{}'::jsonb)) AS k
  WHERE supplier_code = 'cjdropshipping'
  GROUP BY k
  ORDER BY n DESC
  LIMIT 30
`);
console.log("raw_meta keys:", keys.rows);

const { rows } = await c.query(`
  SELECT id, category_path, min_price, primary_thumb_url,
    COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric AS listed,
    COALESCE(raw_meta->>'stockVerified','false') AS stock_verified
  FROM catalog_index
  WHERE supplier_code = 'cjdropshipping' AND source_status <> 'gone'
    AND primary_thumb_url IS NOT NULL AND primary_thumb_url <> ''
`);

/** @type {Record<string, {id:number,listed:number,price:number}[]>} */
const byBucket = {};
for (const r of rows) {
  const bucket = mapCategorySlug(r.category_path ?? []);
  const dept = departmentOfCategorySlug(bucket);
  let key = bucket;
  if (dept === "kids") key = "kids";
  if (dept === "others" || bucket === "unmapped" || bucket === "sourced") key = "others";
  if (!byBucket[key]) byBucket[key] = [];
  byBucket[key].push({
    id: Number(r.id),
    listed: Number(r.listed) || 0,
    price: Number(r.min_price) || 0,
  });
}

const targets = [];
for (const [dept, buckets] of Object.entries(STOREFRONT_BUCKET_ORDER)) {
  if (!buckets.length) targets.push(dept);
  else targets.push(...buckets);
}

console.log("\nbucket sizes (with thumb):");
for (const t of targets) {
  const arr = byBucket[t] || [];
  arr.sort((a, b) => b.listed - a.listed || a.price - b.price || b.id - a.id);
  console.log(
    `  ${t}: total=${arr.length} topListed=${arr[0]?.listed ?? "-"} pick40=${Math.min(40, arr.length)}`,
  );
}

await c.end();
