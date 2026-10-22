import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, hasDb } from "@/db";
import { brands, catalogIndex, products } from "@/db/schema";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { computeSellPrice, SOURCING_FEE, MARKUP_RATE } from "@/lib/hq/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/hq/catalog/reprice
 * catalog_index.min_price(CJ 공장가) → products.price_usd = (공장가+20)*1.3
 * 스토어프론트 진열(Import 실상품)부터 일괄 반영.
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  if (!hasDb()) return bad("DATABASE_URL required", 503);

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = Boolean(body.dryRun);
  const d = db();

  const rows = await d
    .select({
      productId: products.id,
      slug: products.slug,
      currentPrice: products.priceUsd,
      factoryPrice: catalogIndex.minPrice,
      brandSlug: brands.slug,
      categoryPath: catalogIndex.categoryPath,
    })
    .from(products)
    .innerJoin(catalogIndex, eq(catalogIndex.productId, products.id))
    .innerJoin(brands, eq(products.brandId, brands.id))
    .where(and(isNull(products.deletedAt), eq(products.isDummy, false)));

  let updated = 0;
  let skipped = 0;
  const samples: Array<{
    slug: string;
    factoryUsd: number;
    from: number;
    to: number;
  }> = [];

  for (const r of rows) {
    const factory = Number(r.factoryPrice);
    if (!Number.isFinite(factory) || factory < 0) {
      skipped++;
      continue;
    }
    // 문서화된 정책((공장가+20)×1.3, x.9)과 일치시킴 — computeGlobalPrice(KR, 배송비 0)는 원가 수준이라 손실 판매가 됐다
    const sell = computeSellPrice(factory);
    const current = Number(r.currentPrice);
    if (samples.length < 8) {
      samples.push({
        slug: r.slug,
        factoryUsd: factory,
        from: current,
        to: sell,
      });
    }
    if (dryRun) {
      if (Math.abs(current - sell) > 0.001) updated++;
      continue;
    }
    if (Math.abs(current - sell) < 0.001) continue;
    await d
      .update(products)
      .set({ priceUsd: String(sell) })
      .where(eq(products.id, r.productId));
    updated++;
  }

  // catalog 링크 없는 lexi-sourced 실상품은 현재가를 공장가로 가정하지 않음(이미 판매가일 수 있음)
  const [countRow] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(isNull(products.deletedAt), eq(products.isDummy, false)));

  return NextResponse.json({
    ok: true,
    dryRun,
    formula: `(cost + ${SOURCING_FEE}) × ${MARKUP_RATE} → .9 rounding`,
    linkedProducts: rows.length,
    storefrontProducts: countRow?.n ?? 0,
    updated,
    skipped,
    samples,
  });
}
