#!/usr/bin/env node
/**
 * Fashion 부서 베스트 120 — ComfyUI 히어로 + 영문 PDP
 *
 * 선행: ComfyUI (8188), OpenRouter 프록시 (8000)
 * npm run gen:fashion-top120
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import path from "path";
import os from "os";
import { mapCategorySlug, departmentOfCategorySlug } from "../src/lib/catalog/lexi-cj-categories";
import { stableReviewCount } from "../src/lib/catalog/pagination";
import { computeSellPrice } from "../src/lib/hq/types";

const DATA_DIR = path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const LOG_PATH = path.join(DATA_DIR, "gen-fashion-top120.log");
const COMFY_BASE = process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188";
const OR_ENDPOINT =
  process.env.DEEPSEEK_ENDPOINT?.trim() ||
  process.env.OPENROUTER_BASE_URL?.trim() ||
  "http://127.0.0.1:8000/v1/chat/completions";
const OR_KEY = process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim() || "";
const MODEL = process.env.DEEPSEEK_PDP_MODEL || "deepseek/deepseek-v4-flash";

const args = process.argv.slice(2);
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 120);
const OFFSET = Number(args.find((a) => a.startsWith("--offset="))?.split("=")[1] ?? 0);
const DRY_RUN = args.includes("--dry-run");
const FORCE_COMFY = args.includes("--force-comfy");

type CatalogRow = {
  id: number;
  supplierCode: string;
  externalId: string;
  title: string;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  primaryThumbUrl?: string | null;
  sellerName?: string | null;
  sourceStatus: string;
  importState?: string;
  documentId?: number | null;
  productId?: number | null;
  rawMeta?: Record<string, unknown> | null;
  updatedAt?: string;
};

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + "\n", "utf8");
  } catch {
    /* ignore */
  }
}

function isFashionRow(row: CatalogRow): boolean {
  if (row.supplierCode !== "cjdropshipping" || row.sourceStatus !== "active") return false;
  const slug = mapCategorySlug(row.categoryPath);
  return departmentOfCategorySlug(slug) === "fashion";
}

function rankScore(row: CatalogRow): number {
  const slug = row.externalId || String(row.id);
  const listed = Number(row.rawMeta?.listedNum ?? row.rawMeta?.listed_num ?? 0);
  if (Number.isFinite(listed) && listed > 0) return listed * 1_000_000 + stableReviewCount(slug);
  return stableReviewCount(slug);
}

const WF_T2I = `{
  "3": {"class_type": "KSampler", "inputs": {"seed": SEED, "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
  "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "flux1-schnell-fp8.safetensors"}},
  "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 768, "height": 1344, "batch_size": 1}},
  "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "PROMPT", "clip": ["4", 1]}},
  "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["4", 1]}},
  "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
  "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "lexi-fashion-", "images": ["8", 0]}}
}`;

async function comfyReady() {
  try {
    const r = await fetch(`${COMFY_BASE}/system_stats`, { signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function generateComfyImage(productTitle: string, seed: number): Promise<string> {
  const prompt = `Editorial fashion product photo: ${productTitle}. Clean studio lighting, soft shadow, e-commerce hero, full garment visible, premium K-fashion aesthetic, neutral background, sharp focus, 4:5 portrait.`;
  const wf = WF_T2I.replace("PROMPT", prompt.replace(/"/g, "'")).replace("SEED", String(seed));
  const res = await fetch(`${COMFY_BASE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: JSON.parse(wf) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`ComfyUI prompt ${res.status}`);
  const { prompt_id: promptId } = (await res.json()) as { prompt_id: string };
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const h = await fetch(`${COMFY_BASE}/history/${promptId}`, { signal: AbortSignal.timeout(10_000) });
    if (!h.ok) continue;
    const history = (await h.json()) as Record<string, { outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }> }>;
    const item = history[promptId];
    if (!item?.outputs) continue;
    for (const nodeId of Object.keys(item.outputs)) {
      const images = item.outputs[nodeId]?.images;
      if (images?.length) {
        const img = images[0]!;
        return `${COMFY_BASE}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${img.type ?? "output"}`;
      }
    }
  }
  throw new Error("ComfyUI timeout");
}

const PDP_SYSTEM = `You are LEXI's editorial PDP copywriter for a curated K-fashion marketplace.
Generate a complete product detail page in SAMPLE3 editorial style.

Locale: en (English ONLY)
Style: editorial-commerce — poetic but functional, warm yet premium.

Rules:
- Never invent certifications or fake review counts.
- Never use: cheap, wholesale, dropshipping, free shipping, hot sale, best seller.
- USP: exactly 3 sensory benefit bullets in English.
- FAQ: exactly 2 Q&As in English (shipping/duties or care).
- CTA: "Add to bag" or similar.

Return ONLY valid JSON:
{
  "title": "string (English, max 60 chars)",
  "subtitle": "string (English one-liner)",
  "descriptionHtml": "string (English HTML, 2-3 <p> paragraphs)",
  "usps": ["string * 3"],
  "faq": [{"q": "string", "a": "string"} * 2],
  "ctaLabel": "string",
  "seoKeywords": ["string * 5"],
  "galleryAssetIndexes": [0]
}`;

async function callDeepSeek(row: CatalogRow, imageUrl: string) {
  const factory = parseFloat(row.minPrice ?? "0") || 0;
  const sell = computeSellPrice(factory);
  const body = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: `${PDP_SYSTEM}

Product: ${row.title}
Brand/Seller: ${row.sellerName ?? "LEXI Sourced"}
Category: ${(row.categoryPath ?? []).join(" > ")}
Factory cost: USD ${factory.toFixed(2)}
Retail price (duties included): USD ${sell.toFixed(1)}
Image: ${imageUrl}

Respond with valid JSON only.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(OR_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OR_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lexistyle.vercel.app",
        "X-Title": "LEXI Fashion PDP",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 5000));
      continue;
    }
    if (!res.ok) throw new Error(`API ${res.status}: ${json?.error?.message ?? "error"}`);
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty response");
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/m, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
  throw new Error("DeepSeek retries exhausted");
}

function buildPdpHtml(row: CatalogRow, structured: Record<string, unknown>, imageUrl: string, priceUsd: string) {
  const usps = (structured.usps as string[]).map((u) => `<li>${u}</li>`).join("\n");
  const faq = (structured.faq as { q: string; a: string }[])
    .map((f) => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`)
    .join("\n");
  const title = String(structured.title);
  const subtitle = String(structured.subtitle);
  const desc = String(structured.descriptionHtml);
  const cta = String(structured.ctaLabel);
  const keywords = (structured.seoKeywords as string[]).join(", ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="keywords" content="${keywords}">
  <title>${title} | LEXI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',system-ui,sans-serif;background:#faf9f7;color:#1a1a1a;line-height:1.7}
    .hero{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:#ebe6dc}
    .container{max-width:640px;margin:0 auto;padding:24px 20px 64px}
    h1{font-size:24px;font-weight:500;line-height:1.35;margin-bottom:4px}
    .subtitle{font-size:14px;color:#6e6e73;margin-bottom:12px}
    .price-row{display:flex;align-items:baseline;gap:8px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e4e4e0}
    .price-value{font-size:26px;font-weight:600}
    .brand-tag{font-size:13px;color:#6e6e73}
    .desc{font-size:14px;color:#333;line-height:1.8;margin-bottom:32px}
    .desc p{margin-bottom:12px}
    .section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6e6e73;margin-bottom:12px}
    .usps{list-style:none;margin-bottom:32px}
    .usps li{font-size:14px;padding:8px 0;border-bottom:1px solid #f0efeb}
    .usps li:before{content:"✓ "}
    .faq details{padding:12px 0;border-bottom:1px solid #f0efeb}
    .faq summary{font-size:14px;font-weight:500;cursor:pointer}
    .faq p{font-size:13px;color:#6e6e73;margin-top:6px}
    .cta-row{margin-top:12px}
    .cta-btn{display:block;width:100%;background:#1a1a1a;color:#fff;text-align:center;padding:14px 0;font-size:15px;font-weight:500;border-radius:12px;border:none}
  </style>
</head>
<body>
  <img class="hero" src="${imageUrl}" alt="${title}" loading="lazy" />
  <div class="container">
    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <div class="price-row">
      <span class="price-value">$${priceUsd}</span>
      <span class="brand-tag">${row.sellerName ?? "LEXI Sourced"}</span>
    </div>
    <div class="desc">${desc}</div>
    <p class="section-title">Why We Love It</p>
    <ul class="usps">${usps}</ul>
    <p class="section-title">Q&amp;A</p>
    <div class="faq">${faq}</div>
    <div class="cta-row"><button class="cta-btn">${cta}</button></div>
  </div>
</body>
</html>`;
}

async function main() {
  if (!OR_KEY) {
    console.error("OPENROUTER_API_KEY required");
    process.exit(1);
  }
  if (!existsSync(STORE_PATH)) {
    console.error("local store missing:", STORE_PATH);
    process.exit(1);
  }

  const store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as {
    catalog?: CatalogRow[];
    pdpDocs?: Record<string, unknown>[];
    pdpSeq?: number;
  };
  const catalog = store.catalog ?? [];
  const pdpDocs = store.pdpDocs ?? [];
  let docSeq = store.pdpSeq ?? pdpDocs.reduce((m, d) => Math.max(m, (d.id as number) || 0), 0) + 1;

  const fashion = catalog
    .filter(isFashionRow)
    .sort((a, b) => rankScore(b) - rankScore(a) || String(b.updatedAt).localeCompare(String(a.updatedAt)));

  const targets = fashion.slice(OFFSET, OFFSET + LIMIT);
  log(`Fashion=${fashion.length} targets=${targets.length} (rank: listedNum or review proxy)`);

  if (DRY_RUN) {
    targets.slice(0, 15).forEach((r, i) =>
      log(`  ${i + 1}. score=${rankScore(r)} ${r.externalId} ${r.title?.slice(0, 50)}`),
    );
    return;
  }

  const comfyOkInitial = await comfyReady();
  log(comfyOkInitial ? "ComfyUI ready" : "WARN: ComfyUI offline at start — will retry each item");

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of targets) {
    const slug = row.externalId || String(row.id);
    if (row.documentId && !FORCE_COMFY) {
      const existing = pdpDocs.find((d) => d.id === row.documentId);
      const body = (existing?.body ?? {}) as { locale?: string; assetUrls?: string[] };
      const hero = body.assetUrls?.[0] ?? "";
      const hasComfyHero = hero.includes("8188/view") || hero.includes("127.0.0.1:8188");
      if (existing?.renderedHtml && body.locale === "en" && hasComfyHero) {
        skipped++;
        continue;
      }
    }

    log(`[${done + skipped + failed + 1}/${targets.length}] ${slug}`);

    try {
      let imageUrl = row.primaryThumbUrl ?? "";
      let imageEngine = "thumb";
      const comfyOk = await comfyReady();
      if (comfyOk) {
        try {
          const seed = Math.abs([...slug].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)) % 999999;
          imageUrl = await generateComfyImage(row.title ?? "fashion item", seed);
          imageEngine = "comfyui";
          log("  ComfyUI OK");
        } catch (e) {
          log(`  ComfyUI fail: ${(e as Error).message}`);
        }
      }
      if (!imageUrl) throw new Error("no image");

      const structured = await callDeepSeek(row, imageUrl);
      const factory = parseFloat(row.minPrice ?? "0") || 0;
      const priceUsd = computeSellPrice(factory).toFixed(1);
      const renderedHtml = buildPdpHtml(row, structured, imageUrl, priceUsd);
      const docId = row.documentId ?? docSeq++;

      const engineTag = `${imageEngine}+deepseek`;
      const doc = {
        id: docId,
        title: structured.title,
        locale: "en",
        status: "published",
        body: {
          rulesetId: "lexi-pdp-ruleset-v1",
          catalogId: row.id,
          productId: row.productId ?? null,
          engine: engineTag,
          model: MODEL,
          shelfReady: true,
          source: "hq-studio",
          structured,
          assetUrls: [imageUrl],
        },
        renderedHtml,
        catalogId: row.id,
        productId: row.productId ?? null,
        currentVersion: 1,
        rulesetId: "lexi-pdp-ruleset-v1",
        engine: engineTag,
        createdAt: new Date().toISOString(),
      };

      const idx = pdpDocs.findIndex((d) => d.id === docId);
      if (idx >= 0) pdpDocs[idx] = doc;
      else pdpDocs.push(doc);

      row.documentId = docId;
      row.importState = "imported";
      row.updatedAt = new Date().toISOString();

      store.catalog = catalog;
      store.pdpDocs = pdpDocs;
      store.pdpSeq = Math.max(docSeq, docId + 1);
      writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");

      done++;
      log(`  DONE docId=${docId} "${structured.title}"`);
    } catch (e) {
      failed++;
      log(`  FAIL: ${(e as Error).message}`);
    }
  }

  log(`=== done=${done} skipped=${skipped} failed=${failed} ===`);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
