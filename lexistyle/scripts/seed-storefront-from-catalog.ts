/**
 * catalog_index → products 빠른 진열 (CJ 상세/이미지 최적화 생략, thumb URL 사용)
 * 카테고리당 RESTORE_STOREFRONT_PER_CAT (기본 40) → 스토어프론트 더미 폴백 제거
 *
 * DATABASE_URL=Neon 필요
 * npx tsx scripts/seed-storefront-from-catalog.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const neonUrl = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!neonUrl) throw new Error("NEON_DATABASE_URL required");
process.env.DATABASE_URL = neonUrl;

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { brands, categories, productImages, products, siteSettings } from "../src/db/schema";
import {
  LEXI_CJ_BUCKETS,
  activeImportCjChips,
  bucketByKey,
  mapCategorySlug,
  CATEGORY_NAMES,
} from "../src/lib/catalog/lexi-cj-categories";
import { sql } from "drizzle-orm";

const perCat = Math.min(Number(process.env.RESTORE_STOREFRONT_PER_CAT || 40), 100);

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
    [cat] = await d.insert(categories).values({ slug, name }).returning();
  }
  return cat.id as number;
}

async function main() {
  const d = db();
  const brandId = await ensureBrand();
  // LEXI 취급(active) 버킷만 스토어 진열 대상 — leaf 매칭은 mapCategorySlug로.
  const activeBuckets = LEXI_CJ_BUCKETS.filter((b) => b.activeImport);
  const activeChipSet = new Set(activeImportCjChips());
  const bucketCats = new Map<string, number>();
  for (const b of activeBuckets) {
    const id = await ensureCategory(b.key, CATEGORY_NAMES[b.key] ?? b.label);
    bucketCats.set(b.key, id);
  }

  // pick rows with thumb, prefer lexCategoryId in raw_meta — 활성 CJ leaf만
  const rows = await d.execute(sql`
    select id, external_id, title, category_path, min_price, primary_thumb_url, raw_meta, seller_name
    from catalog_index
    where source_status <> 'gone'
      and primary_thumb_url is not null
      and title not ilike '%LEXI Sample%'
      and category_path is not null
      and category_path[1] in (${sql.join(Array.from(activeChipSet).map((chip) => sql`${chip}`), sql`, `)})
    order by updated_at desc nulls last
  `);

  const buckets = new Map<string, typeof rows.rows>();
  for (const r of rows.rows as Record<string, unknown>[]) {
    const path = Array.isArray(r.category_path)
      ? (r.category_path as string[])
      : typeof r.category_path === "string"
        ? [r.category_path]
        : [];
    const leaf = path[0];
    // 취급(active) leaf만 — 미매핑/비취급 상품은 스토어 진열 제외
    if (!leaf || !activeChipSet.has(leaf)) continue;
    const bucket = bucketByKey(mapCategorySlug(path));
    if (!bucket || !bucket.activeImport) continue;
    if (!bucketCats.has(bucket.key)) continue;
    const arr = buckets.get(bucket.key) ?? [];
    if (arr.length < perCat) {
      arr.push(r);
      buckets.set(bucket.key, arr);
    }
  }

  let created = 0;
  let updated = 0;
  for (const [bucketKey, items] of buckets) {
    const categoryId = bucketCats.get(bucketKey)!;
    for (const r of items) {
      const externalId = String(r.external_id);
      const title = String(r.title);
      const slug = slugify(title, externalId);
      const price = String(Number(r.min_price ?? 0) || 0);
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
            priceUsd: price,
            brandId,
            categoryId,
            isDummy: false,
            deletedAt: null,
          })
          .where(eq(products.id, productId));
        updated += 1;
      } else {
        const [p] = await d
          .insert(products)
          .values({
            slug,
            brandId,
            categoryId,
            name: title,
            description: title,
            priceUsd: price,
            stock: 10,
            isDummy: false,
            discountRate: 0,
            ratingAvg: "4.5",
            reviewCount: 12,
          })
          .returning({ id: products.id });
        productId = p.id;
        created += 1;
      }
      await d.delete(productImages).where(eq(productImages.productId, productId));
      await d.insert(productImages).values({ productId, url: thumb, sort: 0, isDummy: false });
    }
    console.log(`✓ ${bucketKey} seeded ${items.length}`);
  }

  // data_mode = real (site_settings.key/value jsonb)
  await d
    .insert(siteSettings)
    .values({ key: "data_mode", value: { mode: "real" }, updatedBy: "seed-storefront" })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: { mode: "real" }, updatedAt: new Date(), updatedBy: "seed-storefront" },
    });

  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.isDummy, false));
  console.log({ created, updated, products: n, perCat });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
