/**
 * 로컬 PG(Tailscale DB 서버) 스토어 전량 진열 — 미연동 blob-PDP를 products로 등록 + 기존 상품 가격 공식 재적용
 *
 * 사용:
 *   npx tsx scripts/publish-local-storefront.ts --dry   # 후보/가격 계획만 출력
 *   npx tsx scripts/publish-local-storefront.ts         # 실제 등록 (로컬 PG)
 *
 * 가격 공식: (cost + 20) × 1.3 → ceil - 0.1 (x.9)  = computeSellPrice
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync, existsSync } from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { brands, catalogIndex, categories, contentDocuments, productImages, products } from "../src/db/schema";
import { computeSellPrice } from "../src/lib/hq/types";

// 로컬 PG 접속 URL (자격증명 파일 우선)
function localUrl(): string {
  const credPath = path.join(os.homedir(), ".lexi-local", "data", "pg-local-credentials.txt");
  try {
    if (existsSync(credPath)) {
      const line = readFileSync(credPath, "utf8").split(/\r?\n/).find((l) => l.startsWith("lexi_url="));
      if (line) return line.slice("lexi_url=".length).trim();
    }
  } catch {
    /* ignore */
  }
  return "postgresql://lexi:lexi@127.0.0.1:5432/lexi";
}
process.env.DATABASE_URL = localUrl();

const dry = process.argv.includes("--dry");
const BRAND_SLUG = "lexi-sourced";

function slugify(title: string, externalId: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${base || "item"}-${externalId}`.slice(0, 72);
}

/** catalog leaf → categories.id (존재하는 slug만) */
function categoryIdForLeaf(leaf: string | null | undefined, cats: Array<{ id: number; slug: string }>): number {
  const l = (leaf ?? "").toLowerCase();
  const bySlug = (slug: string) => cats.find((c) => c.slug === slug)?.id;
  if (/women|lady|dress|blouse|skirt|hoodie|sweat|shirt|pant|swim|top/.test(l)) return bySlug("women") ?? bySlug("fashion") ?? cats[0].id;
  if (/kid|baby|toy|child|girl/.test(l)) return bySlug("kids") ?? bySlug("fashion") ?? cats[0].id;
  if (/dinnerware|storage|kitchen|home|jar|cup|mug|bowl|event|party|decor|craft/.test(l)) return bySlug("life") ?? cats[0].id;
  if (/beauty|cosmetic|skin|hair|nail|makeup/.test(l)) return bySlug("beauty") ?? cats[0].id;
  return bySlug("fashion") ?? cats[0].id;
}
type Candidate = {
  catId: number;
  externalId: string;
  title: string;
  minPrice: number | null;
  documentId: number;
  leaf: string | null;
  assets: string[];
};

async function main() {
  const d = db();

  const [brand] = await d.select().from(brands).where(eq(brands.slug, BRAND_SLUG)).limit(1);
  if (!brand) throw new Error(`brand ${BRAND_SLUG} missing`);
  const cats = await d.select({ id: categories.id, slug: categories.slug }).from(categories);

  // 1) 진열 후보: blob 이미지 PDP + product 미연동 catalog
  const docs = await d.select().from(contentDocuments);
  const cand = await d
    .select({
      id: catalogIndex.id,
      externalId: catalogIndex.externalId,
      title: catalogIndex.title,
      minPrice: catalogIndex.minPrice,
      importState: catalogIndex.importState,
      documentId: catalogIndex.documentId,
      categoryPath: catalogIndex.categoryPath,
    })
    .from(catalogIndex)
    .where(eq(catalogIndex.sourceStatus, "active"));
  const byDoc = new Map(docs.map((x) => [x.id, x]));
  const candidates: Candidate[] = [];
  for (const c of cand) {
    if (c.documentId == null) continue;
    const doc = byDoc.get(c.documentId);
    if (!doc) continue;
    const assets = (doc.body?.assetUrls ?? []) as string[];
    const blobs = assets.filter((u) => String(u).includes("blob.vercel-storage.com"));
    if (!blobs.length) continue;
    candidates.push({
      catId: Number(c.id),
      externalId: String(c.externalId),
      title: String(c.title),
      minPrice: c.minPrice != null ? Number(c.minPrice) : null,
      documentId: c.documentId,
      leaf: c.categoryPath?.[0],
      assets: blobs,
    });
  }

  // product 연동된 catalog id 수집 (이미 진열된 것 제외)
  const linkedCatIds = new Set<number>();
  const allCats = await d.select({ id: catalogIndex.id, productId: catalogIndex.productId }).from(catalogIndex);
  for (const c of allCats) if (c.productId != null) linkedCatIds.add(Number(c.id));

  const existingSlugs = new Set(await d.select({ slug: products.slug }).from(products).then((r) => r.map((x) => String(x.slug))));

  const targets = candidates.filter((c) => !linkedCatIds.has(c.catId));
  console.log(`진열 후보: ${targets.length}건 (미연동 blob-PDP)`);
  const plan: { c: Candidate; price: number; catId: number; slug: string }[] = [];
  for (const c of targets) {
    const price = computeSellPrice(c.minPrice ?? 0);
    const catId = categoryIdForLeaf(c.leaf, cats);
    const slug = slugify(c.title, c.externalId);
    if (existingSlugs.has(slug)) {
      console.log(`  skip(slug 중복): cat=${c.catId} ${slug}`);
      continue;
    }
    plan.push({ c, price, catId, slug });
  }
  console.log(`예상 등록: ${plan.length}건`);
  if (dry) {
    for (const p of plan) {
      console.log(
        `  cat=${p.c.catId} | ${p.c.title.slice(0, 44)} | cost=${p.c.minPrice} → $${p.price.toFixed(2)} | imgs=${p.c.assets.length} | leaf=${p.c.leaf} | catId=${p.catId}`,
      );
    }
    console.log("\n--dry: 쓰기 없음");
    return;
  }
// 2) 실제 등록
  let created = 0;
  for (const p of plan) {
    const [prod] = await d
      .insert(products)
      .values({
        slug: p.slug,
        brandId: brand.id,
        categoryId: p.catId,
        name: p.c.title,
        description: p.c.title,
        priceUsd: String(p.price),
        stock: 100,
        ratingAvg: "4.6",
        reviewCount: 15,
        isDummy: false,
      })
      .returning();
    let sort = 0;
    for (const url of p.c.assets.slice(0, 8)) {
      await d.insert(productImages).values({ productId: prod.id, url, sort: sort++, isDummy: false });
    }
    await d
      .update(catalogIndex)
      .set({ productId: prod.id, importState: "imported", sourceStatus: "active", updatedAt: new Date() })
      .where(eq(catalogIndex.id, p.c.catId));
    created++;
    console.log(`  ✓ cat=${p.c.catId} → product=${prod.id} $${p.price.toFixed(2)} imgs=${Math.min(p.c.assets.length, 8)}`);
  }
  console.log(`\n완료: ${created}건 진열 등록`);
// 3) 기존 products 가격 재적용 (공식 (cost+20)*1.3 → x.9)
  console.log("\n=== 기존 products 가격 재적용 ===");
  const linked = await d
    .select({
      pid: products.id,
      cur: products.priceUsd,
      cost: catalogIndex.minPrice,
    })
    .from(products)
    .innerJoin(catalogIndex, eq(catalogIndex.productId, products.id));
  let repriced = 0;
  for (const r of linked) {
    if (r.cost == null) continue;
    const want = computeSellPrice(Number(r.cost));
    const cur = Number(r.cur);
    if (Math.abs(cur - want) < 0.001) continue;
    await d.update(products).set({ priceUsd: String(want) }).where(eq(products.id, r.pid));
    console.log(`  p=${r.pid} $${cur.toFixed(2)} → $${want.toFixed(2)} (cost=${r.cost})`);
    repriced++;
  }
  console.log(`\n완료: ${repriced}건 가격 공식 적용 (x.9)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  });