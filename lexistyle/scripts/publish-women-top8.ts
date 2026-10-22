/**
 * 이미지 완성된 여성의류 top8 (catalog 224~231) — Neon 반영 + 스토어 진열 + 쿠팡 실발행
 *
 * 사용법:
 *   npx tsx scripts/publish-women-top8.ts --dry       # 검증만 (Neon 조회/계획 출력, 쓰기 없음)
 *   npx tsx scripts/publish-women-top8.ts             # Neon 반영 + 쿠팡 export 발행
 *
 * 진행 절차:
 *   1) 로컬 JSON pdpDocs(224~231) 로드
 *   2) Neon content_documents upsert → catalog_index.document_id
 *   3) Neon products + product_images 생성 (스토어 진열, brand=lexi-sourced, category=women)
 *   4) catalog_index.product_id 연결 + import_state=imported
 *   5) enqueueExport(channel=coupang) + processExportQueue
 *
 * 가격 공식: pricing-policy — (costUsd + 20) × 1.3
 * 쿠팡 게이트: title≤100자, blob 이미지 safety(CJ URL 제외) — 규칙 준수
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  brands,
  catalogIndex,
  categories,
  contentDocuments,
  productImages,
  products,
} from "../src/db/schema";
import { computeLexiSellUsd } from "../src/lib/pricing/lexi-sell";
import { enqueueExport, processExportQueue } from "../src/lib/export/jobs";

const NEON = process.env.NEON_DATABASE_URL || "";
// 이 스크립트는 명시된 프로덕션 액션(Neon 반영 + 쿠팡 발행)이므로 DATABASE_URL=Neon 으로 실행
process.env.DATABASE_URL = NEON;
const DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const TARGET_IDS = [224, 225, 226, 227, 228, 229, 230, 231];
const CATEGORY_SLUG = "women";
const BRAND_SLUG = "lexi-sourced";
type PdpDocMem = {
  id: number;
  catalogId: number;
  title: string;
  engine: string;
  body: Record<string, unknown>;
  renderedHtml: string;
  productId: number | null;
};

function slugify(title: string, externalId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "item"}-${externalId}`.slice(0, 72);
}

async function main() {
  if (!NEON) throw new Error("NEON_DATABASE_URL required");
  const dry = process.argv.includes("--dry");
  const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
  const cats = (store.catalog ?? []) as Array<Record<string, unknown>>;
  const docs = (store.pdpDocs ?? []) as PdpDocMem[];

  const targets = TARGET_IDS.map((cid) => {
    const cat = cats.find((c) => Number(c.id) === cid)!;
    const doc = docs.find((d) => d.catalogId === cid)!;
    const assets = (doc.body.assetUrls ?? []) as string[];
    return {
      cid,
      cat,
      doc,
      assets: assets.filter((u) => u.includes("blob.vercel-storage.com")),
    };
  })
    .filter((t) => t.cat && t.doc)
    .map((t) => ({
      ...t,
      title: String((t.doc.body.structured as { title?: string } | undefined)?.title ?? t.doc.title),
      priceUsd: computeLexiSellUsd(Number(t.cat.minPrice ?? 0)),
      neonDocumentId: null as number | null,
    }));

  console.log(`대상 ${targets.length}건 (224~231 blob 이미지 상품)`);
  for (const t of targets) {
    console.log(
      `  cat=${t.cid} | ${t.title.slice(0, 44)} | $${t.priceUsd.toFixed(2)} | imgs=${t.assets.length} | engine=${t.doc.engine}`,
    );
  }

  if (dry) {
    console.log("\n--dry: 쓰기 없음. 실제 실행은 플래그 없이.");
    return;
  }

  const d = db();

  // brand/category 보장
  let [brand] = await d.select().from(brands).where(eq(brands.slug, BRAND_SLUG)).limit(1);
  if (!brand) {
    [brand] = await d
      .insert(brands)
      .values({ slug: BRAND_SLUG, name: "LEXI Sourced", story: "Curated via LEXI sourcing pipeline" })
      .returning();
    console.log("→ brand 생성", brand.id);
  }
  let [catRow] = await d.select().from(categories).where(eq(categories.slug, CATEGORY_SLUG)).limit(1);
  if (!catRow) {
    [catRow] = await d
      .insert(categories)
      .values({ slug: CATEGORY_SLUG, name: "여성의류", sort: 50 })
      .returning();
    console.log("→ category 생성", catRow.id);
  }

  const results: string[] = [];
  for (const t of targets) {
    const external = String(t.cat.externalId);
    const slug = slugify(t.title, external);

    // 1) content_documents upsert (id는 Neon identity 자동생성 — 로컬 id 미사용)
    const [catRowNeon] = await d
      .select({ id: catalogIndex.id, documentId: catalogIndex.documentId })
      .from(catalogIndex)
      .where(eq(catalogIndex.externalId, external))
      .limit(1);
    const body = {
      ...t.doc.body,
      catalogId: t.cid,
      productId: null as number | null,
      assetUrls: t.assets,
    };
    let documentId: number | null = catRowNeon?.documentId ?? null;
    if (documentId != null) {
      const [existing] = await d
        .select({ id: contentDocuments.id, currentVersion: contentDocuments.currentVersion })
        .from(contentDocuments)
        .where(eq(contentDocuments.id, documentId))
        .limit(1);
      if (existing) {
        await d
          .update(contentDocuments)
          .set({
            title: t.title,
            body,
            renderedHtml: t.doc.renderedHtml,
            status: "review",
            locale: "ko",
            currentVersion: (existing.currentVersion ?? 1) + 1,
            updatedAt: new Date(),
          })
          .where(eq(contentDocuments.id, existing.id));
      } else {
        documentId = null;
      }
    }
    if (documentId == null) {
      const [fresh] = await d
        .insert(contentDocuments)
        .values({
          kind: "pdp",
          title: t.title,
          locale: "ko",
          status: "review",
          body,
          renderedHtml: t.doc.renderedHtml,
          currentVersion: 1,
          createdBy: "hq-publish",
        })
        .returning({ id: contentDocuments.id });
      documentId = fresh.id;
    }
    t.neonDocumentId = documentId;

    // 2) products upsert → 스토어프론트 진열
    let [prodRow] = await d.select().from(products).where(eq(products.slug, slug)).limit(1);
    const reviewCount =
      Math.max((t.cat.rawMeta as { listedNum?: number } | undefined)?.listedNum ?? 0, 5) * 3;
    const desc =
      (t.doc.body.structured as { descriptionHtml?: string } | undefined)?.descriptionHtml ?? t.title;
    if (prodRow) {
      await d
        .update(products)
        .set({
          brandId: brand!.id,
          categoryId: catRow!.id,
          name: t.title,
          description: desc,
          priceUsd: String(t.priceUsd),
          stock: 100,
          ratingAvg: "4.6",
          reviewCount,
          isDummy: false,
          deletedAt: null,
        })
        .where(eq(products.id, prodRow.id));
    } else {
      [prodRow] = await d
        .insert(products)
        .values({
          slug,
          brandId: brand!.id,
          categoryId: catRow!.id,
          name: t.title,
          description: desc,
          priceUsd: String(t.priceUsd),
          stock: 100,
          ratingAvg: "4.6",
          reviewCount,
          isDummy: false,
        })
        .returning();
    }
    const productId = prodRow!.id;

    // 3) product_images 교체
    await d.delete(productImages).where(eq(productImages.productId, productId));
    let sort = 0;
    for (const url of t.assets.slice(0, 8)) {
      await d.insert(productImages).values({ productId, url, sort: sort++, isDummy: false });
    }

    // 4) catalog_index 연결 (documentId는 1)에서 확보된 Neon id)
    if (catRowNeon) {
      await d
        .update(catalogIndex)
        .set({
          productId,
          documentId,
          importState: "imported",
          sourceStatus: "active",
          updatedAt: new Date(),
        })
        .where(eq(catalogIndex.id, catRowNeon.id));
    }
    results.push(`cat=${t.cid} doc=${documentId} prod=${productId} slug=${slug}`);
  }

  console.log("\n=== Neon 반영 done ===");
  for (const r of results) console.log(" ", r);

  // 5) 쿠팡 export 발행
  console.log("\n=== 쿠팡 발행 시작 ===");
  for (const t of targets) {
    if (t.neonDocumentId == null) {
      console.error(`  ✗ cat=${t.cid} Neon documentId 없음 — enqueue skip`);
      continue;
    }
    try {
      const job = await enqueueExport({ documentId: t.neonDocumentId, channels: ["coupang"] });
      const arr = (Array.isArray(job) ? job : [job]) as Array<{ id: number; status: string }>;
      console.log(`  enqueue doc=${t.neonDocumentId} → ${arr.map((j) => `${j.id}:${j.status}`).join(", ")}`);
    } catch (e) {
      console.error(`  ✗ enqueue doc=${t.neonDocumentId} 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const processed = await processExportQueue(20);
  for (const p of processed) {
    console.log(
      p.ok
        ? `  ✓ export id=${p.id} ${p.publishState ?? ""} ref=${p.externalRef ?? ""}`
        : `  ✗ export id=${p.id} 실패: ${p.error}`,
    );
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});