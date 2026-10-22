#!/usr/bin/env npx tsx
/**
 * 패션 PDP 1건 테스트 — ComfyUI 3-act 이미지 생성 + PDP 문서 저장
 * IMAGE_PROVIDER=comfyui (기본)
 * npx tsx scripts/gen-one-comfy-fashion-pdp.ts --catalogId=3578 --test
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

import { computeSellPrice } from "../src/lib/hq/types";
import { sample3ConceptSpec, sample3OgPreviewHtml } from "../src/lib/hq/seeds/sample3-style";
import { generatePdpText } from "../src/lib/pdp/text-generate";
import { renderPdp, toBlocks } from "../src/lib/pdp/generate";
import { generateMarketingAssets } from "../src/lib/pdp/marketing-images";
import type { PdpStructured } from "../src/lib/pdp/ruleset";

const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const OUT_DIR = path.join(process.cwd(), "public", "comfy-pdp-demo");

const catalogId = parseInt(process.argv.find((a) => a.startsWith("--catalogId="))?.split("=")[1] ?? "3578", 10);
const isTest = process.argv.includes("--test");

function getStore() {
  return JSON.parse(readFileSync(STORE, "utf8"));
}

function getCatalogRow(id: number) {
  const s = getStore();
  return (s.catalog ?? []).find((r: any) => Number(r.id) === id) ?? null;
}

async function main() {
  const row = getCatalogRow(catalogId);
  if (!row) throw new Error(`catalog item ${catalogId} not found in local store`);
  if (!row.primaryThumbUrl) throw new Error("no thumb");

  const thumb = row.primaryThumbUrl;
  const sell = computeSellPrice(parseFloat(row.minPrice ?? "0") || 0);
  const chip = row.categoryPath?.[0] ?? "Fashion";

  console.log(`\n=== Product [${catalogId}]: ${row.title}`);
  console.log(`    CJ: $${row.minPrice} → 판매가 $${sell.toFixed(1)} | ${chip}`);

  // ============================================================
  // STEP 1: 3-act 이미지 생성 (ComfyUI T2I)
  // ============================================================
  console.log("\n--- Image Generation (3-act via ComfyUI) ---");
  const { urls: assetUrls, imageMock, imageError } = await generateMarketingAssets({
    productName: row.title,
    category: (row.categoryPath ?? []).join(" > ") || "fashion",
    existingUrls: [thumb, thumb, thumb],
    styleOverride: `Young Asian female fashion editorial model, soft natural makeup, wearing "${row.title}" garment as main outfit, upper body shot, looking at camera, centered face and torso, cream paper studio (#faf9f7), soft window light, K-fashion lookbook, 4:5 portrait`,
  });

  console.log(`  Result: ${assetUrls.length} URLs, mock=${imageMock}${imageError ? ` error=${imageError}` : ""}`);
  assetUrls.forEach((u, i) => console.log(`    [${i}] ${u.slice(0, 80)}`));

  if (assetUrls.length === 0) {
    throw new Error("image generation failed — no asset URLs returned");
  }

  // ============================================================
  // STEP 2: PDP 텍스트 생성
  // ============================================================
  console.log("\n--- Text Generation ---");
  const concept = sample3ConceptSpec({
    rulesetId: "SAMPLE3-FASHION",
    title: row.title,
    formHint: `${chip} — ${row.title}`,
    voiceTag: "SAMPLE3 · LEXI Curated",
  });

  let doc: PdpStructured;
  let engine = "template";
  let model: string | undefined;

  try {
    const result = await generatePdpText({
      title: row.title,
      category: (row.categoryPath ?? []).join(" > ") || "fashion",
      price: `USD ${sell.toFixed(1)} (duties included)`,
      seller: row.sellerName ?? "LEXI Sourced",
      locale: "ko",
      assetUrls,
      voice: concept.voice,
      copyRuleset: concept.copyRuleset,
    });
    doc = result.doc;
    engine = result.engine;
    model = result.model;
    console.log(`  ✓ ${engine}${model ? ` / ${model}` : ""}`);
  } catch {
    doc = {
      title: row.title,
      subtitle: `${chip} — curated for LEXI`,
      descriptionHtml: `<p>${row.title} — LEXI에서 엄선한 프리미엄 패션.</p>`,
      usps: [
        "고급 소재와 정교한 마감",
        "편안한 핏과 세련된 실루엣",
        "LEXI 검증 소싱 · 투명한 가격",
      ],
      faq: [
        { q: "세탁 방법은?", a: "찬물 세탁, 건조기 사용 자제." },
        { q: "관세가 포함되나요?", a: "결제 시 예상 관세가 포함됩니다." },
        { q: "반품은 어떻게?", a: "LEXI가 반품을 처리합니다." },
      ],
      ctaLabel: "LEXI 장바구니 담기",
      seoKeywords: ["LEXI", row.title, "패션", chip],
      galleryAssetIndexes: [0, 1, 2].filter((i) => i < assetUrls.length),
    };
    console.log("  ℹ template fallback");
  }

  // ============================================================
  // STEP 3: HTML 조립 + PDP Store 저장
  // ============================================================
  const html = renderPdp(doc, assetUrls, concept);

  // Store PDP doc so /product/[slug] can find it
  const store = getStore();
  if (!store.pdpDocs) store.pdpDocs = [];
  if (!store.pdpSeq) store.pdpSeq = 1;

  const body = {
    rulesetId: "SAMPLE3-FASHION",
    catalogId,
    productId: null,
    engine,
    model: model ?? null,
    structured: doc,
    assetUrls,
    designDoc: { blocks: toBlocks(doc, assetUrls, concept) },
    source: "hq-studio",
    shelfReady: true,
    conceptSpec: concept,
  };

  const existingIdx = store.pdpDocs.findIndex((d: any) => d.catalogId === catalogId);
  const docId = existingIdx >= 0 ? store.pdpDocs[existingIdx].id : store.pdpSeq++;
  const entry = {
    id: docId,
    title: doc.title,
    locale: "ko",
    status: "review",
    body,
    renderedHtml: html,
    catalogId: row.id,
    productId: null,
    currentVersion: existingIdx >= 0 ? store.pdpDocs[existingIdx].currentVersion + 1 : 1,
    rulesetId: "SAMPLE3-FASHION",
    engine,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) store.pdpDocs[existingIdx] = entry;
  else store.pdpDocs.unshift(entry);
  store.pdpSeq = store.pdpSeq;
  writeFileSync(STORE, JSON.stringify(store, null, 2), "utf8");
  console.log(`  ✓ PDP document saved: docId=${docId}`);

  // ============================================================
  // STEP 4: Preview HTML
  // ============================================================
  if (isTest) {
    mkdirSync(OUT_DIR, { recursive: true });

    const brandStrip = `<section style="padding:16px 24px;border-bottom:1px solid #e8e4dc;background:#faf9f7">
  <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#6e6e73">LEXI CURATED · ${chip}</p>
  <p style="margin:4px 0 0;font-size:13px;color:#6e6e73">
    Image: ${imageMock ? "CJ source" : "AI regenerated"} · ${engine}${model ? ` · ${model}` : ""}
    ${imageError ? ` · ⚠ ${imageError}` : ""}
  </p>
</section>`;

    const ogBlock = sample3OgPreviewHtml({
      ogSrc: assetUrls[0],
      title: doc.title,
      caption: `${chip} · image ${imageMock ? "CJ" : "AI"} · ${engine}`,
    });

    const fullPage = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${doc.title} | LEXI</title>
  <meta property="og:title" content="${doc.title}"/>
  <meta property="og:image" content="${assetUrls[0]}"/>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; background:#faf9f7; color:#1a1a1a; font-family:system-ui,-apple-system,sans-serif; }
    .lexi-pdp { max-width:720px; margin:0 auto; padding:0 8px; background:#faf9f7; font-size:15px; }
    .lexi-pdp img { max-width:100%; height:auto; display:block; border-radius:14px; }
    .spec-table { width:100%; border-collapse:collapse; }
    .spec-table th { text-align:left; padding:8px; border:1px solid #e4e4e0; width:30%; }
    .spec-table td { padding:8px; border:1px solid #e4e4e0; }
    details { border:1px solid #e4e4e0; border-radius:14px; padding:12px; margin:8px 0; }
    details summary { font-weight:700; cursor:pointer; }
    .cta-btn { display:inline-block; background:#e85d4c; color:#fff; font-weight:700; padding:14px 40px; border-radius:14px; text-decoration:none; }
    .hero-img { width:100%; border-radius:14px; aspect-ratio:4/5; object-fit:cover; }
    footer { padding:24px; text-align:center; font-size:12px; color:#6e6e73; }
  </style>
</head>
<body>
${brandStrip}
${html}
${ogBlock}
<footer>
  <p>© LEXI · catalogId=${catalogId} · docId=${docId}</p>
</footer>
</body>
</html>`;

    writeFileSync(path.join(OUT_DIR, "index.html"), fullPage, "utf8");
    console.log(`  ✓ Preview: ${path.join(OUT_DIR, "index.html")}`);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Product: ${row.title}`);
  console.log(`docId: ${docId}`);
  console.log(`engine: ${engine}${model ? ` / ${model}` : ""}`);
  console.log(`imageMock: ${imageMock}`);
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});