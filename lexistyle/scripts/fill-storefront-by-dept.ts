/**
 * Neon catalog → 스토어프론트 진열 (부서별 N건, CJ 버킷 카테고리)
 * npx tsx scripts/fill-storefront-by-dept.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const neonUrl = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!neonUrl) throw new Error("NEON_DATABASE_URL required");
process.env.DATABASE_URL = neonUrl;

import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { brands, categories, productImages, products, siteSettings } from "../src/db/schema";
import {
  LEXI_CJ_BUCKETS,
  bucketByKey,
  departmentOfCategorySlug,
  mapCategorySlug,
  CATEGORY_NAMES,
  type LexiDept,
} from "../src/lib/catalog/lexi-cj-categories";
import { computeSellPrice } from "../src/lib/hq/types";

const PER_DEPT = Math.min(Number(process.env.PER_DEPT || 10), 30);
const DEPTS: LexiDept[] = ["beauty", "fashion", "life", "kids"];

function slugify(title: string, externalId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "item"}-${externalId}`.slice(0, 72);
}

async function ensureBrand() {
  const d = db();
  let [brand] = await d.select().from(brands).where(eq(brands.slug, "lexi-sourced")).limit(1);
  if (!brand) {
    [brand] = await d
      .insert(brands)
      .values({ slug: "lexi-sourced", name: "LEXI Sourced", story: "Curated via LEXI sourcing pipeline" })
      .returning();
  }
  return brand.id as number;
}

async function ensureCategory(slug: string, name: string) {
  const d = db();
  let [cat] = await d.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!cat) {
    [cat] = await d.insert(categories).values({ slug, name, sort: 99 }).returning();
  }
  return cat.id as number;
}

async function main() {
  const d = db();

  await d.execute(sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price_usd numeric(10,2)
  `);

  const brandId = await ensureBrand();
  const bucketCats = new Map<string, number>();
  for (const b of LEXI_CJ_BUCKETS) {
    bucketCats.set(b.key, await ensureCategory(b.key, CATEGORY_NAMES[b.key] ?? b.label));
  }
  bucketCats.set("kids", await ensureCategory("kids", "키즈"));

  const rows = await d.execute(sql`
    SELECT id, external_id, title, category_path, min_price, primary_thumb_url
    FROM catalog_index
    WHERE source_status <> 'gone'
      AND primary_thumb_url IS NOT NULL
      AND title NOT ILIKE '%LEXI Sample%'
      AND category_path IS NOT NULL
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 12000
  `);

  const picked: Record<LexiDept, Record<string, unknown>[]> = {
    beauty: [],
    fashion: [],
    life: [],
    kids: [],
    others: [],
  };

  for (const r of rows.rows as Record<string, unknown>[]) {
    const path = Array.isArray(r.category_path)
      ? (r.category_path as string[])
      : typeof r.category_path === "string"
        ? [r.category_path]
        : [];
    const bucketKey = mapCategorySlug(path);
    const dept = departmentOfCategorySlug(bucketKey);
    if (dept === "sourced" || !DEPTS.includes(dept)) continue;
    if (picked[dept].length >= PER_DEPT) continue;
    if (!bucketByKey(bucketKey)) continue;
    picked[dept].push(r);
  }

  let created = 0;
  let updated = 0;
  for (const dept of DEPTS) {
    console.log(`\n${dept}: ${picked[dept].length} items`);
    for (const r of picked[dept]) {
      const externalId = String(r.external_id);
      const title = String(r.title);
      const path = r.category_path as string[];
      const bucketKey = mapCategorySlug(path);
      const categoryId = bucketCats.get(bucketKey)!;
      const slug = slugify(title, externalId);
      const factory = Number(r.min_price ?? 0);
      const sell = computeSellPrice(Number.isFinite(factory) ? factory : 0);
      const thumb = String(r.primary_thumb_url);

      const [existing] = await d.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
      let productId: number;
      if (existing) {
        productId = existing.id;
        await d
          .update(products)
          .set({
            name: title,
            description: title,
            priceUsd: String(sell),
            brandId,
            categoryId,
            isDummy: false,
            deletedAt: null,
          })
          .where(eq(products.id, productId));
        updated++;
      } else {
        const [p] = await d
          .insert(products)
          .values({
            slug,
            brandId,
            categoryId,
            name: title,
            description: title,
            priceUsd: String(sell),
            stock: 10,
            isDummy: false,
            discountRate: 0,
            ratingAvg: "4.5",
            reviewCount: 12,
          })
          .returning({ id: products.id });
        productId = p.id;
        created++;
      }
      await d.delete(productImages).where(eq(productImages.productId, productId));
      await d.insert(productImages).values({ productId, url: thumb, sort: 0, isDummy: false });
      console.log(`  [${bucketKey}] ${title.slice(0, 55)}`);
    }
  }

  await d
    .insert(siteSettings)
    .values({ key: "data_mode", value: { mode: "real" }, updatedBy: "fill-storefront-by-dept" })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: { mode: "real" }, updatedAt: new Date(), updatedBy: "fill-storefront-by-dept" },
    });

  const counts = await d.execute(sql`
    SELECT c.slug, count(*)::int AS cnt
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_dummy = false AND p.deleted_at IS NULL
    GROUP BY c.slug ORDER BY cnt DESC
  `);
  console.log("\n=== counts ===");
  for (const row of counts.rows as { slug: string; cnt: number }[]) {
    console.log(`  ${row.slug}: ${row.cnt}`);
  }
  console.log({ created, updated, perDept: PER_DEPT });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
