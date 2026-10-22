/**
 * 더미데이터 → catalog_index + products 이관
 * 스토어프론트의 더미 상품 280개를 HQ 파이프라인(Import → Export) 구조로 옮긴다.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { brands, categories, catalogIndex, productImages, products } from "@/db/schema";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { cjShortLabel } from "@/lib/catalog/category-taxonomy";
import { products as dummyProducts, type CjCategory } from "@/lib/dummy-data";

export const dynamic = "force-dynamic";

const CAT_PATH: Record<string, string[]> = {
  "women-clothing": ["여성 의류"],
  pet: ["애완용품"],
  "home-garden": ["홈, 가든 & 가구"],
  beauty: ["건강, 미용 및 헤어"],
  jewelry: ["보석 및 시계"],
  "men-clothing": ["남성 의류"],
  "bags-shoes": ["가방 및 신발"],
  kids: ["장난감, 어린이 및 유아용품"],
  sports: ["스포츠 및 아웃도어"],
  electronics: ["소비자 가전제품"],
  "home-improve": ["주택 개량"],
  auto: ["자동차 및 오토바이"],
  phones: ["휴대폰 및 액세서리"],
  computers: ["컴퓨터 및 사무용품"],
};

export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  if (!hasDb()) return bad("DB required", 400);

  try {
    const d = db();
    let created = 0;
    let skipped = 0;

    for (const dp of dummyProducts) {
      const extId = `dummy-${dp.slug}`;
      const [existing] = await d.select({ id: catalogIndex.id }).from(catalogIndex).where(eq(catalogIndex.externalId, extId)).limit(1);
      if (existing) { skipped++; continue; }

      const brandSlug = dp.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let [brand] = await d.select().from(brands).where(eq(brands.slug, brandSlug)).limit(1);
      if (!brand) {
        [brand] = await d.insert(brands).values({ slug: brandSlug, name: dp.brand, story: `${dp.brand} — LEXI sourced`, isDummy: false }).returning();
      }

      let [cat] = await d.select().from(categories).where(eq(categories.slug, dp.category)).limit(1);
      if (!cat) {
        [cat] = await d.insert(categories).values({ slug: dp.category, name: cjShortLabel(dp.category as CjCategory), sort: 50 }).returning();
      }

      const stock = 100 + Math.floor(Math.random() * 200);
      const [prod] = await d.insert(products).values({
        slug: dp.slug, brandId: brand.id, categoryId: cat.id,
        name: dp.name, priceUsd: String(dp.price), discountRate: dp.discountRate,
        stock, ratingAvg: String(dp.rating), reviewCount: dp.reviewCount, isDummy: false,
      }).returning();

      await d.insert(productImages).values({ productId: prod.id, url: dp.image, sort: 0, isDummy: false });

      await d.insert(catalogIndex).values({
        supplierCode: "cjdropshipping",
        externalId: extId,
        title: dp.name,
        categoryPath: CAT_PATH[dp.category] ?? ["기타"],
        minPrice: String(dp.price), maxPrice: String(dp.price),
        currency: "USD", stock,
        primaryThumbUrl: dp.image,
        sellerName: dp.brand,
        searchableText: `${dp.name} ${dp.brand} ${dp.slug}`.toLowerCase(),
        importState: "imported",
        productId: prod.id,
        sourceStatus: "active",
      });

      created++;
    }

    return NextResponse.json({ created, skipped, total: dummyProducts.length });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "migration failed", 500);
  }
}