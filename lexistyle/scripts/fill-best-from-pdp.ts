/**
 * PDP document_id 있는 catalog → products 진열 (Best용)
 * npx tsx scripts/fill-best-from-pdp.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const neonUrl = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!neonUrl) throw new Error("NEON_DATABASE_URL required");
process.env.DATABASE_URL = neonUrl;

import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { brands, categories, productImages, products, siteSettings, catalogIndex } from "../src/db/schema";
import {
  mapCategorySlug,
  CATEGORY_NAMES,
  LEXI_CJ_BUCKETS,
} from "../src/lib/catalog/lexi-cj-categories";
import { computeSellPrice } from "../src/lib/hq/types";
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
  await d.execute(sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS hs_category text
  `);

  const brandId = await ensureBrand();
  const bucketCats = new Map<string, number>();
  for (const b of LEXI_CJ_BUCKETS) {
    bucketCats.set(b.key, await ensureCategory(b.key, CATEGORY_NAMES[b.key] ?? b.label));
  }
  bucketCats.set("kids", await ensureCategory("kids", "키즈"));
  bucketCats.set("sourced", await ensureCategory("sourced", "소싱"));

  const rows = await d.execute(sql`
    SELECT id, external_id, title, category_path, min_price, primary_thumb_url, product_id, document_id
    FROM catalog_index
    WHERE document_id IS NOT NULL
      AND source_status <> 'gone'
      AND title NOT ILIKE '%LEXI Sample%'
    ORDER BY id DESC
  `);

  let created = 0;
  let updated = 0;
  let linked = 0;

  for (const r of rows.rows as Record<string, unknown>[]) {
    const catalogId = Number(r.id);
    const externalId = String(r.external_id);
    const title = String(r.title);
    const path = Array.isArray(r.category_path)
      ? (r.category_path as string[])
      : typeof r.category_path === "string"
        ? [r.category_path]
        : [];
    const bucketKey = mapCategorySlug(path);
    const categoryId = bucketCats.get(bucketKey) ?? bucketCats.get("sourced")!;
    const slug = slugify(title, externalId);
    const factory = Number(r.min_price ?? 0);
    const sell = computeSellPrice(Number.isFinite(factory) ? factory : 0);
    const thumb = String(r.primary_thumb_url || "");

    let productId = r.product_id != null ? Number(r.product_id) : null;

    if (productId) {
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
      const [bySlug] = await d.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
      if (bySlug) {
        productId = bySlug.id;
        await d
          .update(products)
          .set({
            name: title,
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
            reviewCount: 48,
          })
          .returning({ id: products.id });
        productId = p.id;
        created++;
      }
      await d.update(catalogIndex).set({ productId }).where(eq(catalogIndex.id, catalogId));
      linked++;
    }

    if (thumb) {
      await d.delete(productImages).where(eq(productImages.productId, productId));
      await d.insert(productImages).values({ productId, url: thumb, sort: 0, isDummy: false });
    }
  }

  await d
    .insert(siteSettings)
    .values({ key: "data_mode", value: { mode: "real" }, updatedBy: "fill-best-from-pdp" })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: { mode: "real" }, updatedAt: new Date(), updatedBy: "fill-best-from-pdp" },
    });

  const counted = await d.execute(sql`
    SELECT count(*)::int AS n
    FROM products p
    JOIN catalog_index c ON c.product_id = p.id
    WHERE c.document_id IS NOT NULL AND p.deleted_at IS NULL AND coalesce(p.is_dummy,false)=false
  `);
  const n = Number((counted.rows[0] as { n: number }).n);

  console.log({ created, updated, linked, bestListed: n, totalCatalogWithPdp: rows.rows.length });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
