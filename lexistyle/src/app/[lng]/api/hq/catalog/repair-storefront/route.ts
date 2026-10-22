import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, hasDb } from "@/db";
import { brands, catalogIndex, categories, products } from "@/db/schema";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { patchCatalog } from "@/lib/catalog/index-store";
import { CATEGORY_NAMES, mapCategorySlug } from "@/lib/catalog/lexi-cj-categories";

export const dynamic = "force-dynamic";

/**
 * POST /api/hq/catalog/repair-storefront
 * products(실상품) ↔ catalog_index.importState 역동기화 + 카테고리 재매핑.
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  if (!hasDb()) return bad("DATABASE_URL required", 503);

  const d = db();
  const [brand] = await d
    .select()
    .from(brands)
    .where(eq(brands.slug, "lexi-sourced"))
    .limit(1);

  const productRows = await d
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brandId: products.brandId,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(and(isNull(products.deletedAt), eq(products.isDummy, false)));

  let linked = 0;
  let already = 0;
  let categoriesFixed = 0;
  const unmatched: { id: number; slug: string; name: string }[] = [];

  for (const p of productRows) {
    const [byPid] = await d
      .select()
      .from(catalogIndex)
      .where(eq(catalogIndex.productId, p.id))
      .limit(1);

    let matched = byPid ?? null;

    if (!matched) {
      const ext = p.slug.includes("-") ? p.slug.split("-").slice(-1)[0] : null;
      if (ext && ext.length >= 6) {
        const [byExt] = await d
          .select()
          .from(catalogIndex)
          .where(eq(catalogIndex.externalId, ext))
          .limit(1);
        matched = byExt ?? null;
      }
    }
    if (!matched) {
      const [byTitle] = await d
        .select()
        .from(catalogIndex)
        .where(eq(catalogIndex.title, p.name))
        .limit(1);
      matched = byTitle ?? null;
    }

    if (!matched) {
      unmatched.push({ id: p.id, slug: p.slug, name: p.name });
      continue;
    }

    if (matched.importState !== "imported" || matched.productId !== p.id) {
      await patchCatalog(matched.id, { importState: "imported", productId: p.id });
      linked++;
    } else {
      already++;
    }

    const wantSlug = mapCategorySlug(matched.categoryPath);
    let [cat] = await d.select().from(categories).where(eq(categories.slug, wantSlug)).limit(1);
    if (!cat) {
      [cat] = await d
        .insert(categories)
        .values({
          slug: wantSlug,
          name: CATEGORY_NAMES[wantSlug] ?? wantSlug,
          sort: 50,
        })
        .returning();
    }
    if (cat && p.categoryId !== cat.id) {
      await d.update(products).set({ categoryId: cat.id }).where(eq(products.id, p.id));
      categoriesFixed++;
    }
  }

  const cats = await d.select({ slug: categories.slug }).from(categories);
  return NextResponse.json({
    ok: true,
    products: productRows.length,
    lexiSourcedBrand: brand?.id ?? null,
    alreadyLinked: already,
    repaired: linked,
    categoriesFixed,
    unmatched,
    categories: cats.map((c) => c.slug),
  });
}
