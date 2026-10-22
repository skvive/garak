// filepath: src/app/api/cafe24/sync/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin";
import { cafe24Mode } from "@/lib/cafe24/config";
import { listCafe24Products } from "@/lib/cafe24/catalog";
import { db, hasDb } from "@/db";
import { brands, categories, productImages, products } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Cafe24 → Neon hybrid sync (admin only) */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (cafe24Mode() === "off") {
    return NextResponse.json({ error: "Cafe24 not configured" }, { status: 503 });
  }
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });

  const cafeProducts = await listCafe24Products();
  if (!cafeProducts?.length) {
    return NextResponse.json({ error: "no cafe24 products", upserted: 0 });
  }

  const database = db();
  let upserted = 0;

  for (const cat of ["beauty", "fashion", "life", "kids"]) {
    await database
      .insert(categories)
      .values({ slug: cat, name: cat, sort: 0 })
      .onConflictDoNothing();
  }

  for (const p of cafeProducts) {
    const brandSlug = p.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "lexi";
    let [brand] = await database.select().from(brands).where(eq(brands.slug, brandSlug)).limit(1);
    if (!brand) {
      [brand] = await database
        .insert(brands)
        .values({ slug: brandSlug, name: p.brand, isDummy: false })
        .returning();
    }
    const [cat] = await database
      .select()
      .from(categories)
      .where(eq(categories.slug, p.category))
      .limit(1);
    if (!cat) continue;

    const existing = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, p.slug))
      .limit(1);

    if (existing[0]) {
      await database
        .update(products)
        .set({
          name: p.name,
          priceUsd: String(p.price),
          discountRate: p.discountRate,
          cafe24ProductNo: p.cafe24ProductNo,
          deletedAt: null,
        })
        .where(eq(products.id, existing[0].id));
      upserted++;
    } else {
      const [row] = await database
        .insert(products)
        .values({
          slug: p.slug,
          name: p.name,
          brandId: brand.id,
          categoryId: cat.id,
          priceUsd: String(p.price),
          discountRate: p.discountRate,
          stock: 100,
          ratingAvg: String(p.rating),
          reviewCount: p.reviewCount,
          cafe24ProductNo: p.cafe24ProductNo,
          isDummy: false,
        })
        .returning();
      await database.insert(productImages).values({
        productId: row.id,
        url: p.image,
        sort: 0,
        isDummy: false,
      });
      upserted++;
    }
  }

  return NextResponse.json({ ok: true, upserted, total: cafeProducts.length });
}
