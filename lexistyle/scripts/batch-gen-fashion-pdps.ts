/**
 * 배치 SAMPLE3 PDP 생성기 — 모든 Import 완료된 CJ 상품 + 더미 스토어프론트 상품
 * SAMPLE3 규칙 + fashion AI model 착장 프롬프트 적용
 *
 * 사용법: npx tsx scripts/batch-gen-fashion-pdps.ts
 */
import { catalogIndex } from "@/db/schema";
import { db, hasDb } from "@/db";
import { eq } from "drizzle-orm";
import { getCatalogById, searchCatalog } from "@/lib/catalog/index-store";
import { generatePdpForCatalog, listPdpDocuments, isShelfReadyPdp } from "@/lib/pdp/generate";
import { sample3ConceptSpec, SAMPLE3_COPY_RULES, SAMPLE3_TOKENS, SAMPLE3_BLOCK_PLAN } from "@/lib/hq/seeds/sample3-style";
import { enqueueExport, processExportQueue } from "@/lib/export/jobs";
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import { localStore, scheduleLocalPersist } from "@/lib/local-store";

const BATCH_SIZE = 20; // 한 번에 처리할 개수 (재시도 가능)
const CONCURRENT = 5;  // 동시 생성 수

/** Fashion 이미지 프롬프트 (AI model 착장) */
function fashionImagePlan(title: string, formHint: string): ConceptSpec["imageRecipe"] {
  return {
    generate: true,
    style: `SAMPLE3 editorial with AI model wearing "${title}". ${formHint}. Cream paper mood, LEXI brand atmosphere, K-fashion magazine quality.`,
    backgroundPolicy: "replace",
    replacePrompt: "cafe window, soft plaza, or cream studio background for LEXI editorial campaign",
    plan: [
      {
        role: "hero",
        size: "portrait",
        prompt: `Young Asian female fashion editorial model, soft natural makeup, wearing "${title}" garment as main outfit, upper body shot, looking at camera, centered face and torso, clean cream paper studio background (#faf9f7), soft diffused natural window light, the garment is the hero — sharp focus on fabric texture and silhouette, K-fashion editorial lookbook style, 4:5 portrait, photorealistic, high detail fabric texture, no label text, no logo, no watermark. ${formHint}`,
      },
      {
        role: "macro",
        size: "portrait",
        prompt: `Close-up macro detail of "${title}" fabric texture and seam finish, soft focus on weave, knit, or drape quality, natural light, K-fashion textile editorial, square composition, artisanal craftsmanship feel, no label text, no watermark. ${formHint}`,
      },
      {
        role: "trust",
        size: "portrait",
        prompt: `Young Asian female model with the same appearance as hero shot, wearing "${title}" garment as main outfit, warm minimal lifestyle setting, candid everyday moment, soft natural side light, cozy interior or outdoor plaza, natural expression showing garment drape and fit, lifestyle editorial photography, same model same face as hero shot, leave lower third clear for UI overlay, warm neutrals without readable text or numbers, LEXI campaign confidence. ${formHint}`,
      },
    ],
  };
}

/** Beauty 이미지 프롬프트 (기존 3막) */
function beautyImagePlan(title: string, cat: string): ConceptSpec["imageRecipe"] {
  return {
    generate: true,
    style: `SAMPLE3 beauty editorial for "${title}". ${cat}, luxury cream paper mood`,
    backgroundPolicy: "replace",
    replacePrompt: "marble vanity and soft lifestyle for LEXI beauty campaign",
    plan: [
      {
        role: "hero",
        size: "portrait",
        prompt: `Hero product photo of "${title}". Luxury morning light, marble or cream vanity, soft water ripples suggesting moisture and glow, ${cat} editorial commerce, cream paper mood (#faf9f7), shallow depth of field, photorealistic, 4:5 portrait, no label text, no logo, no watermark.`,
      },
      {
        role: "macro",
        size: "square",
        prompt: `Macro beauty still of "${title}" texture: single luminous droplet or cream swirl matching the color of the source product, dewy green leaves or clean studio props, shallow depth of field, ${cat} commercial K-style editorial, square composition, no label text, no watermark.`,
      },
      {
        role: "trust",
        size: "landscape",
        prompt: `Unboxing lifestyle of "${title}" in an open gift box with satin lining, soft peach-cream bokeh sparkle without readable stars or numbers, editorial commerce, leave calm lower third for UI overlay, photorealistic, warm neutrals, no text.`,
      },
    ],
  };
}

/** 카테고리 → fashion 분류 */
function isFashionCategory(catPath: string[] | null): boolean {
  if (!catPath?.length) return false;
  const joined = catPath.join(" ").toLowerCase();
  const fashionTerms = /\b(women|men|clothing|fashion|apparel|dress|shirt|top|jacket|pants|skirt|bag|shoe|accessorie|jewelry|watch|outwear|swim|lingerie|sock|hoodie|sweater|knit|blazer|coat|cargo)\b/i;
  return fashionTerms.test(joined);
}

/** 카테고리 → beauty 분류 */
function isBeautyCategory(catPath: string[] | null): boolean {
  if (!catPath?.length) return false;
  const joined = catPath.join(" ").toLowerCase();
  return /\b(beauty|skin|makeup|cosmetic|hair|body|nail|fragrance|serum|cream|lotion|wash|mask|sun)\b/i.test(joined);
}

/** CatalogRow → SAMPLE3 ConceptSpec */
function buildConceptSpec(row: {
  id: number;
  title: string;
  categoryPath: string[] | null;
  sellerName: string | null;
  primaryThumbUrl: string | null;
}): ConceptSpec {
  const catPath = row.categoryPath ?? [];
  const catLabel = catPath.join(" > ") || "General";
  const isFashion = isFashionCategory(catPath);
  const isBeauty = isBeautyCategory(catPath);

  const formHint = isFashion
    ? `${catLabel} product — ${row.title}`
    : `${catLabel} product`;

  const imageRecipe = isFashion
    ? fashionImagePlan(row.title, formHint)
    : isBeauty
      ? beautyImagePlan(row.title, catLabel)
      : undefined; // 기본 SAMPLE3 이미지

  const base = sample3ConceptSpec({
    rulesetId: `CJ-${row.id}`,
    title: row.title,
    formHint,
    voiceTag: isFashion
      ? `SAMPLE3 · LEXI Curated · fashion · model wearing`
      : `SAMPLE3 · LEXI Curated · ${catLabel}`,
    seedCatalogId: row.id,
    imagePlan: imageRecipe?.plan,
  });

  return base;
}

/** 배치 PDP 생성 */
async function generateBatch(items: { id: number; title: string; categoryPath: string[] | null; sellerName: string | null; primaryThumbUrl: string | null }[]) {
  const results: { catalogId: number; title: string; ok: boolean; docId?: number; error?: string }[] = [];

  for (const row of items) {
    try {
      console.log(`  [GEN] catalog=${row.id}: "${row.title?.slice(0, 50)}..."`);
      const concept = buildConceptSpec(row);
      const result = await generatePdpForCatalog(row.id, {
        locale: "ko",
        conceptSpec: concept,
      });
      console.log(`    → docId=${result.documentId}, engine=${result.engine}`);
      results.push({ catalogId: row.id, title: row.title, ok: true, docId: result.documentId });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.error(`    ✗ FAILED: ${err}`);
      results.push({ catalogId: row.id, title: row.title, ok: false, error: err });
    }
  }

  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log(`\n  ✅ Generated: ${ok.length}/${items.length}`);
  if (fail.length) {
    console.log(`  ❌ Failed: ${fail.length}`);
    for (const f of fail) console.log(`    - catalog=${f.catalogId}: ${f.error}`);
  }

  return results;
}

async function main() {
  console.log("=== SAMPLE3 PDP 배치 생성기 ===\n");

  // Step 1: Import 완료된 catalog items 수집
  console.log("Step 1: Collecting imported catalog items...");
  let items: any[] = [];

  if (hasDb()) {
    // Neon DB 모드
    const rows = await db()
      .select({
        id: catalogIndex.id,
        title: catalogIndex.title,
        categoryPath: catalogIndex.categoryPath,
        sellerName: catalogIndex.sellerName,
        primaryThumbUrl: catalogIndex.primaryThumbUrl,
        importState: catalogIndex.importState,
        documentId: catalogIndex.documentId,
      })
      .from(catalogIndex)
      .where(eq(catalogIndex.importState, "imported"))
      .limit(500);
    items = rows;
  } else {
    // 로컬 스토어 모드
    const ls = localStore() as any;
    const cats: any[] = (ls.catalog ?? []).filter(
      (c: any) => c.importState === "imported" && c.supplierCode === "cjdropshipping",
    );
    items = cats;

    // storefront-pdp 아이템도 추가 (더미 시드)
    const storefrontItems = (ls.catalog ?? []).filter(
      (c: any) => c.supplierCode === "storefront-pdp",
    );
    // 이미 doc 있으면 skip
    const existingDocIds = new Set<number>();
    for (const d of ls.pdpDocs ?? []) {
      const catId = d.body?.catalogId;
      if (catId != null) existingDocIds.add(catId);
    }
    for (const si of storefrontItems) {
      if (!existingDocIds.has(si.id)) {
        items.push(si);
      }
    }
  }

  console.log(`  Total imported items: ${items.length}`);

  // 이미 PDP 문서가 있는 항목 제외
  const withoutDoc = items.filter((r: any) => r.documentId == null);
  console.log(`  Items without PDP doc: ${withoutDoc.length}`);

  if (withoutDoc.length === 0) {
    console.log("\n  ✅ 모든 imported 항목에 이미 PDP 문서가 있습니다.");
  } else {
    // Step 2: 배치 PDP 생성
    console.log("\nStep 2: Generating PDPs in batches...");

    const batchSize = BATCH_SIZE;
    let done = 0;
    let totalOk = 0;

    for (let i = 0; i < withoutDoc.length; i += batchSize) {
      const batch = withoutDoc.slice(i, i + batchSize);
      console.log(`\n--- Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(withoutDoc.length / batchSize)} (${batch.length} items) ---`);
      const results = await generateBatch(batch);
      totalOk += results.filter((r) => r.ok).length;
      done += batch.length;
      console.log(`  Progress: ${done}/${withoutDoc.length}`);
    }

    console.log(`\n✅ Total PDPs created: ${totalOk}/${withoutDoc.length}`);
  }

  // Step 3: 모든 진열용 PDP 문서 Export
  console.log("\nStep 3: Exporting all shelf-ready PDP documents...");
  const docs = await listPdpDocuments(200);
  const shelfDocs = docs.filter((d: any) => isShelfReadyPdp(d as any));
  console.log(`  Shelf-ready documents: ${shelfDocs.length}`);

  let exportCount = 0;
  for (const doc of shelfDocs) {
    const docId = (doc as any).id;
    try {
      console.log(`  [EXPORT] docId=${docId}: "${String((doc as any).title ?? "").slice(0, 40)}..."`);
      await enqueueExport({
        documentId: docId,
        channels: ["lexi", "cafe24"],
        operation: "create",
      });
      exportCount++;
    } catch (e) {
      console.error(`    ✗ Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`  Enqueued exports: ${exportCount}`);

  // Step 4: Export 큐 처리
  if (exportCount > 0) {
    console.log("\nStep 4: Processing export queue...");
    const exportResults = await processExportQueue(50);
    const ok = exportResults.filter((r: any) => r.ok).length;
    const failed = exportResults.filter((r: any) => !r.ok).length;
    console.log(`  Export results: ${ok} ok, ${failed} failed`);
  }

  console.log("\n=== DONE ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});