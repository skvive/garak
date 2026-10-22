#!/usr/bin/env npx tsx
/**
 * SAMPLE3 PDP 1건 생성 — 정식 파이프라인 사용
 *
 * 생성 순서:
 *   1. CJ 원본 이미지를 visual reference로 다운로드
 *   2. generateMarketingAssets()로 S1/S2/S3 3-act AI 재생성
 *      → provider chain: comfyui(T2I) > wan > openai > fal > mock
 *      → mock이면 existingUrls(CJ 원본)로 fallback
 *   3. 생성된 assetUrls를 optimizeAndStore로 WebP 최적화 저장
 *   4. generatePdpText로 카피 생성 (template fallback)
 *   5. renderPdp + conceptSpec → HTML 조립
 *
 * 이미지 생성 우선순위 (정책):
 *   1원칙: ComfyUI 로컬 T2I (Wan 2.2 / FLUX — checkpoint 필요)
 *   2원칙: Wan MaaS (WAN_API_KEY 필요)
 *   3원칙: Cursor 이미지 생성기 (MCP)
 *   4원칙: OpenRouter 등 유료 API (사용자 허락 시)
 *   ※ 모든 실패 시: CJ 원본 → sharp WebP 최적화 fallback
 *
 * npm run gen:comfy-pdp-demo
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import os from "os";
import sharp, { type OutputInfo } from "sharp";
import { mapCategorySlug, departmentOfCategorySlug } from "../src/lib/catalog/lexi-cj-categories";
import { stableReviewCount } from "../src/lib/catalog/pagination";
import { computeSellPrice } from "../src/lib/hq/types";
import { sample3ConceptSpec, sample3OgPreviewHtml } from "../src/lib/hq/seeds/sample3-style";
import { generatePdpText } from "../src/lib/pdp/text-generate";
import { renderPdp, toBlocks } from "../src/lib/pdp/generate";
import { generateMarketingAssets } from "../src/lib/pdp/marketing-images";
import type { PdpStructured } from "../src/lib/pdp/ruleset";

const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const OUT_DIR = path.join(process.cwd(), "public", "comfy-pdp-demo");

/** 이미지 최적화 규격 (sharp WebP) */
const IMAGE_SPECS = {
  hero: { width: 960, height: 1200, fit: "inside" as const, quality: 78 },
  macro: { width: 720, height: 720, fit: "inside" as const, quality: 78 },
};

type CatRow = {
  id: number;
  externalId: string;
  title: string;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  primaryThumbUrl?: string | null;
  sellerName?: string | null;
};

async function pickProduct(): Promise<CatRow> {
  const store = JSON.parse(readFileSync(STORE, "utf8"));
  const rows = (store.catalog ?? []) as CatRow[];
  const fashion = rows
    .filter(
      (c) =>
        (c as { supplierCode?: string; sourceStatus?: string }).supplierCode === "cjdropshipping" &&
        (c as { sourceStatus?: string }).sourceStatus === "active" &&
        departmentOfCategorySlug(mapCategorySlug(c.categoryPath)) === "fashion",
    )
    .sort((a, b) => stableReviewCount(b.externalId) - stableReviewCount(a.externalId));
  if (!fashion[0]) throw new Error("no fashion product in local store");
  return fashion[0];
}

async function downloadBuf(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** sharp WebP 최적화 — CJ 원본 fallback용 */
async function sharpOptimize(
  srcBuf: Buffer,
  spec: typeof IMAGE_SPECS.hero,
  label: string,
): Promise<OutputInfo & { data: Buffer }> {
  const { data, info } = await sharp(srcBuf)
    .rotate()
    .resize(spec.width, spec.height, { fit: spec.fit, withoutEnlargement: false })
    .webp({ quality: spec.quality, alphaQuality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const kb = (info.size / 1024).toFixed(1);
  console.log(`  ✓ ${label}: ${info.width}×${info.height} ${kb}KB WebP`);
  return { data, ...info };
}

/** provider 체인 결과물 or CJ sharp fallback 저장 */
function saveImages(
  heroBuf: Buffer,
  macroBuf: Buffer,
): { heroFile: string; macroFile: string } {
  mkdirSync(OUT_DIR, { recursive: true });
  const heroFile = "lexi-comfy-hero.webp";
  const macroFile = "lexi-comfy-macro.webp";
  writeFileSync(path.join(OUT_DIR, heroFile), heroBuf);
  writeFileSync(path.join(OUT_DIR, macroFile), macroBuf);
  console.log(`  ✓ images saved to ${OUT_DIR}`);
  return { heroFile, macroFile };
}

// --- main ---

async function main() {
  const product = await pickProduct();
  const thumb = product.primaryThumbUrl;
  if (!thumb) throw new Error("product has no thumb");

  console.log(`\n=== Product: ${product.title}`);
  console.log(`CJ source: ${thumb}`);

  // ============================================================
  // STEP 1: 이미지 생성 — 정식 파이프라인 경유
  // ============================================================
  // generateMarketingAssets()가 내부에서 provider chain을 타고
  // S1 Hero / S2 Macro / S3 Trust 3장을 생성한다.
  // mock provider에 existingUrls(CJ)가 있으면 CJ 원본을 fallback한다.
  // ============================================================
  console.log("\n--- Image Generation (3-act pipeline) ---");
  const { urls: assetUrls, imageMock, imageError } = await generateMarketingAssets({
    productName: product.title,
    category: (product.categoryPath ?? []).join(" > ") || "fashion",
    existingUrls: [thumb, thumb], // CJ 원본 — mock provider fallback용
  });

  console.log(`  Result: ${assetUrls.length} URLs, mock=${imageMock}${imageError ? ` error=${imageError}` : ""}`);
  assetUrls.forEach((u, i) => console.log(`    [${i}] ${u}`));

  // assetUrls를 sharp WebP로 재최적화 (provider 결과가 mock/picsum이어도 WebP 변환)
  let heroBuf: Buffer;
  let macroBuf: Buffer;
  let heroInfo: OutputInfo | null = null;

  try {
    const srcBuf = await downloadBuf(assetUrls[0]);
    const r1 = await sharpOptimize(srcBuf, IMAGE_SPECS.hero, "hero");
    heroBuf = r1.data;
    heroInfo = r1;
  } catch {
    // provider 결과 다운로드 실패 → CJ 원본 fallback
    console.log("  ℹ hero fetch failed, using CJ source fallback");
    const srcBuf = await downloadBuf(thumb);
    const r1 = await sharpOptimize(srcBuf, IMAGE_SPECS.hero, "hero (CJ fallback)");
    heroBuf = r1.data;
    heroInfo = r1;
  }

  try {
    const srcIdx = assetUrls.length > 1 ? 1 : 0;
    const srcBuf = await downloadBuf(assetUrls[srcIdx]);
    const r2 = await sharpOptimize(srcBuf, IMAGE_SPECS.macro, "macro");
    macroBuf = r2.data;
  } catch {
    const srcBuf = await downloadBuf(thumb);
    const r2 = await sharpOptimize(srcBuf, IMAGE_SPECS.macro, "macro (CJ fallback)");
    macroBuf = r2.data;
  }

  const { heroFile, macroFile } = saveImages(heroBuf, macroBuf);
  const relPath = "/comfy-pdp-demo";
  const finalUrls = [`${relPath}/${heroFile}`, `${relPath}/${macroFile}`];

  // ============================================================
  // STEP 2: 텍스트 생성 + 개념 스펙
  // ============================================================
  console.log("\n--- Text Generation ---");
  const sell = computeSellPrice(parseFloat(product.minPrice ?? "0") || 0);
  const concept = sample3ConceptSpec({
    rulesetId: "SAMPLE3-PIPELINE",
    title: product.title,
    formHint: `${mapCategorySlug(product.categoryPath)} — ${product.title}`,
    voiceTag: "SAMPLE3 · LEXI Curated",
  });

  let doc: PdpStructured;
  let engine = "template";
  let model: string | undefined;

  try {
    const result = await generatePdpText({
      title: product.title,
      category: (product.categoryPath ?? []).join(" > ") || "fashion",
      price: `USD ${sell.toFixed(1)} (duties included)`,
      seller: product.sellerName ?? "LEXI Sourced",
      locale: "en",
      assetUrls: finalUrls,
      voice: concept.voice,
      copyRuleset: concept.copyRuleset,
    });
    doc = result.doc;
    engine = result.engine;
    model = result.model;
    console.log(`  ✓ ${engine}${model ? ` / ${model}` : ""}`);
  } catch {
    doc = {
      title: product.title,
      subtitle: "From the Boys Bags edit — curated for LEXI",
      descriptionHtml: `<p>${product.title} — redesigned for LEXI with duty-aware pricing and curated presentation.</p>`,
      usps: [
        "Soft, breathable fabric for all-day comfort",
        "Clean silhouette that layers without bulk",
        "LEXI-verified sourcing with transparent pricing",
      ],
      faq: [
        { q: "How should I care for this piece?", a: "Wash cold, gentle cycle, and air-dry." },
        { q: "Are duties included?", a: "Checkout totals include estimated duties." },
        { q: "How to return?", a: "Supplier A/S handles returns; LEXI tracks the ticket." },
      ],
      ctaLabel: "Add to LEXI bag",
      seoKeywords: ["LEXI", product.title, "men", "bags"],
      galleryAssetIndexes: [0, 1],
    };
    console.log("  ℹ template fallback (credits low)");
  }

  // ============================================================
  // STEP 3: HTML 조립 + SAMPLE3 스타일
  // ============================================================
  const html = renderPdp(doc, finalUrls, concept);

  const brandStrip = `<section style="padding:16px 24px;border-bottom:1px solid #e8e4dc;background:#faf9f7">
  <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#6e6e73">LEXI CURATED · SAMPLE3</p>
  <p style="margin:4px 0 0;font-size:13px;color:#6e6e73">
    Image: ${imageMock ? "CJ source" : "AI regenerated"} · ${engine}${model ? ` · ${model}` : ""}${heroInfo ? ` · ${(heroInfo.size / 1024).toFixed(1)}KB` : ""}
    ${imageError ? ` · ⚠ ${imageError}` : ""}
  </p>
</section>`;

  const ogBlock = sample3OgPreviewHtml({
    ogSrc: finalUrls[0],
    title: doc.title,
    caption: "SAMPLE3 pipeline: CJ reference → AI 3-act → WebP optimized.",
  });

  const fullPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${doc.title} | LEXI Demo</title>
  <meta property="og:title" content="${doc.title}"/>
  <meta property="og:image" content="${finalUrls[0]}"/>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; background:#faf9f7; color:#1a1a1a; font-family:system-ui,-apple-system,sans-serif; }
    .lexi-pdp { max-width:720px; margin:0 auto; font-family:system-ui,sans-serif; color:#1a1a1a; background:#faf9f7; font-size:15px; padding:0 8px; }
    .lexi-pdp img { max-width:100%; height:auto; display:block; }
    .spec-table { width:100%; border-collapse:collapse; font-size:15px; }
    .spec-table th { text-align:left; padding:8px; border:1px solid #e4e4e0; background:#faf9f7; color:#1a1a1a; width:30%; }
    .spec-table td { padding:8px; border:1px solid #e4e4e0; color:#1a1a1a; }
    details { border:1px solid #e4e4e0; border-radius:14px; padding:12px; margin:8px 0; font-size:15px; }
    details summary { font-weight:700; color:#1a1a1a; cursor:pointer; }
    .cta-btn { display:inline-block; background:#e85d4c; color:#fff; font-weight:700; padding:14px 40px; border-radius:14px; text-decoration:none; }
    .hero-img { width:100%; border-radius:14px; aspect-ratio:4/5; object-fit:cover; }
    .macro-img { width:100%; border-radius:14px; }
    footer { padding:24px; text-align:center; font-size:12px; color:#6e6e73; }
  </style>
</head>
<body>
${brandStrip}
${html}
${ogBlock}
<footer>
  <p>© LEXI · slug ${product.externalId}</p>
  <p style="font-size:11px;color:#aaa">
    CJ reference → ${imageMock ? "sharp WebP fallback (no T2I provider)" : "AI regenerated"}
    ${heroInfo ? `· ${heroInfo.width}×${heroInfo.height} · ${(heroInfo.size / 1024).toFixed(1)}KB WebP` : ""}
  </p>
</footer>
</body>
</html>`;

  writeFileSync(path.join(OUT_DIR, "index.html"), fullPage, "utf8");
  writeFileSync(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify({
      product,
      engine,
      model,
      imageMock,
      imageError,
      providerChain: process.env.IMAGE_PROVIDER || "comfyui>wan>openai>fal>mock",
      heroBytes: heroInfo?.size ?? 0,
      heroDimensions: heroInfo ? { width: heroInfo.width, height: heroInfo.height } : null,
      blocks: toBlocks(doc, finalUrls, concept),
    }, null, 2),
    "utf8",
  );

  console.log(`\n=== DONE ===`);
  console.log(`Product: ${product.title}`);
  console.log(`Slug: ${product.externalId}`);
  console.log(`Image source: ${imageMock ? "CJ fallback (mock provider)" : "AI regenerated via provider chain"}`);
  if (heroInfo) console.log(`Hero: ${heroInfo.width}×${heroInfo.height} · ${(heroInfo.size / 1024).toFixed(1)}KB WebP`);
  console.log(`File: ${path.join(OUT_DIR, "index.html")}`);
  console.log(`URL: http://localhost:3000/comfy-pdp-demo`);
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});