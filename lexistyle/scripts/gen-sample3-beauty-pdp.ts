#!/usr/bin/env npx tsx
/**
 * 뷰티·메이크업 SAMPLE3 PDP 생성 — AMBA 모델 착용샷 (ComfyUI FLUX) + SAMPLE3 HTML
 *
 * 사용법:
 *   npx tsx scripts/gen-sample3-beauty-pdp.ts --catalogId=236    # 립스틱 1건
 *   npx tsx scripts/gen-sample3-beauty-pdp.ts --batch=3          # 뷰티 상위 3건
 *   npx tsx scripts/gen-sample3-beauty-pdp.ts --list             # 뷰티 상품 목록
 *   npx tsx scripts/gen-sample3-beauty-pdp.ts --catalogId=236 --no-image
 *
 * 로컬 ComfyUI (FLUX.1 schnell)으로 크레딧 차감 없이 AI 화보 생성
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";

import { computeSellPrice } from "../src/lib/hq/types";
import { generatePdpText } from "../src/lib/pdp/text-generate";
import type { PdpStructured } from "../src/lib/pdp/ruleset";
import { pickAmbaCast, toModelCast } from "../src/lib/pdp/amba-casts";
import type { AmbaCast, ModelCastProfile } from "../src/lib/pdp/amba-casts";
import { buildMarketingImagePlan } from "../src/lib/pdp/marketing-prompt";

// === Configuration ===
const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const SAMPLE3_BASE = path.join(process.cwd(), "public", "sample3");
const COMFY_BASE = "http://127.0.0.1:8188";
const COMFY_TIMEOUT_MS = 300_000;

// 뷰티 상품 카테고리 키워드 (activeImport 기준)
const BEAUTY_CATS = [
  "Lipstick", "Eyeshadow", "Eyebrow Pencil", "False Eyelashes",
  "Makeup Brushes", "Makeup Set", "Nail Art Kits", "Nail Gel",
  "Synthetic Wigs", "Human Hair Wigs",
];

// ============================================================
// Store helpers
// ============================================================
function getStore() {
  return JSON.parse(readFileSync(STORE, "utf8"));
}

function listBeautyProducts() {
  const s = getStore();
  const rows = (s.catalog ?? []).filter((r: any) => {
    if (r.supplierCode !== "cjdropshipping") return false;
    if (r.sourceStatus !== "active") return false;
    const cats = r.categoryPath ?? [];
    return BEAUTY_CATS.some((bc) => cats.includes(bc));
  });
  return rows;
}

function getCatalogRow(id: number) {
  const s = getStore();
  return (s.catalog ?? []).find((r: any) => Number(r.id) === id) ?? null;
}

// ============================================================
// Image helpers
// ============================================================
async function downloadBuf(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function sharpOptimize(buf: Buffer, w: number, h: number, q: number, label: string): Promise<Buffer> {
  const { data, info } = await sharp(buf)
    .rotate()
    .resize(w, h, { fit: "inside", withoutEnlargement: false })
    .webp({ quality: q, alphaQuality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  console.log(`  ✓ ${label}: ${info.width}×${info.height} ${(info.size/1024).toFixed(1)}KB WebP`);
  return data;
}

function slugify(title: string, externalId: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  return `beauty-${base || "item"}-${String(externalId).slice(-8)}`.slice(0, 48);
}

// ============================================================
// Beauty-specific helpers
// ============================================================
function koBeautyCategory(cat: string): string {
  const map: Record<string, string> = {
    "Lipstick": "립스틱",
    "Eyeshadow": "아이섀도우",
    "Eyebrow Pencil": "아이브로우",
    "False Eyelashes": "속눈썹",
    "Makeup Brushes": "메이크업 브러쉬",
    "Makeup Set": "메이크업 세트",
    "Nail Art Kits": "네일",
    "Nail Gel": "네일 젤",
    "Synthetic Wigs": "가발",
    "Human Hair Wigs": "가발",
  };
  return map[cat] ?? "메이크업";
}

function koBeautyEyebrow(cat: string): string {
  const topCats = ["립스틱", "아이섀도우", "메이크업"];
  return topCats.some((c) => cat.includes(c)) ? "LEXI CURATED · MAKEUP" : "LEXI CURATED · BEAUTY";
}

const BEAUTY_LEAD_TEMPLATES: Record<string, string> = {
  "Lipstick": "립스틱 하나가 바꾸는 메이크업의 완성. LEXI가 고른 컬러, 오래 지속되는 발색.",
  "Eyeshadow": "눈매를 살리는 아이섀도우, LEXI 큐레이션으로 고른 팔레트 하나면 충분합니다.",
  "Eyebrow Pencil": "자연스러운 눈썹 표현의 정석. LEXI가 검증한 아이브로우 필수템.",
  "nail": "네일 아트의 완성은 꼼꼼한 관리부터. LEXI가 엄선한 네일 케어.",
  "wig": "자연스러운 스타일링 체인지, LEXI가 고른 헤어 피스로 완성.",
};

function leadForProduct(title: string, cat: string): string {
  for (const [key, tpl] of Object.entries(BEAUTY_LEAD_TEMPLATES)) {
    if (cat.includes(key) || title.toLowerCase().includes(key.toLowerCase())) return tpl;
  }
  return "메이크업 루틴에 더하는 LEXI의 큐레이션. 당신의 화장대에 새로울 한 조각.";
}

const BEAUTY_STYLING_NOTES: Record<string, string[]> = {
  "Lipstick": ["립 라이너로 윤곽 정리 후 매트 립스틱 — 오피스", "글로스 레이어링 — 데이트 무드", "틴트 + 블러셔 — 모노톤 메이크업"],
  "Eyeshadow": ["베이스 컬러→폴드→라인 순서로 그라데이션", "언더라인 포인트 — 시선 집중", "글리터 탑코트 — 저녁 메이크업"],
  "nail": ["베이스 코트 필수 — 네일 보호", "2중 도포로 선명한 발색", "탑 코트로 마무리 — 지속력 업"],
};

function stylingForProduct(cat: string): string[] {
  for (const [key, notes] of Object.entries(BEAUTY_STYLING_NOTES)) {
    if (cat.includes(key)) return notes;
  }
  return ["베이스 메이크업으로 피부 정돈", "포인트 제품으로 중심 살리기", "세팅 스프레이로 마무리"];
}

// ============================================================
// ComfyUI FLUX API
// ============================================================
async function comfyPrompt(workflow: any): Promise<string> {
  const res = await fetch(`${COMFY_BASE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ComfyUI ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.prompt_id;
}

async function comfyWaitImage(promptId: string, maxWaitMs = COMFY_TIMEOUT_MS): Promise<Buffer> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(`${COMFY_BASE}/history/${promptId}`, {
        signal: AbortSignal.timeout(10000),
      });
      const history = await res.json();
      const item = history[promptId];
      if (item?.outputs) {
        for (const nodeId of Object.keys(item.outputs)) {
          const images = item.outputs[nodeId]?.images;
          if (images?.length > 0) {
            const img = images[0];
            const imgRes = await fetch(
              `${COMFY_BASE}/view?filename=${img.filename}&subfolder=${img.subfolder ?? ""}&type=${img.type ?? "output"}`,
              { signal: AbortSignal.timeout(30000) }
            );
            if (!imgRes.ok) throw new Error(`fetch image ${imgRes.status}`);
            return Buffer.from(await imgRes.arrayBuffer());
          }
        }
      }
    } catch { /* still processing */ }
  }
  throw new Error(`ComfyUI timeout (${Math.round(maxWaitMs/1000)}s)`);
}

function buildFluxWorkflow(promptText: string, width: number, height: number, seed: number): any {
  const clipL = promptText.slice(0, 256);
  const t5xxl = promptText;
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "FLUX.1-schnell-dev-merged-fp8.safetensors" } },
    "2": { class_type: "DualCLIPLoader", inputs: { clip_name1: "t5xxl_fp8_e4m3fn.safetensors", clip_name2: "clip_l.safetensors", type: "flux" } },
    "3": { class_type: "VAELoader", inputs: { vae_name: "flux1-ae.safetensors" } },
    "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
    "5": { class_type: "CLIPTextEncodeFlux", inputs: { clip: ["2", 0], clip_l: clipL.replace(/"/g, "'"), t5xxl: t5xxl.replace(/"/g, "'"), guidance: 3.5 } },
    "5n": { class_type: "CLIPTextEncodeFlux", inputs: { clip: ["2", 0], clip_l: "", t5xxl: "", guidance: 3.5 } },
    "6": { class_type: "KSampler", inputs: { seed, steps: 4, cfg: 1, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["1", 0], positive: ["5", 0], negative: ["5n", 0], latent_image: ["4", 0] } },
    "7": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["3", 0] } },
    "8": { class_type: "SaveImage", inputs: { filename_prefix: "lexi-beauty-", images: ["7", 0] } },
  };
}

async function generateFluxImage(promptText: string, width: number, height: number, seed: number, label: string): Promise<Buffer | null> {
  try {
    const wf = buildFluxWorkflow(promptText, width, height, seed);
    const pid = await comfyPrompt(wf);
    const buf = await comfyWaitImage(pid);
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`  ✓ FLUX ${label}: ${kb}KB`);
    return buf;
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 80) : "unknown";
    console.warn(`  ⚠ FLUX ${label} failed: ${msg}`);
    return null;
  }
}

// ============================================================
// Beauty-specific FLUX prompts (model wearing makeup)
// ============================================================
function buildBeautyImagePlan(title: string, cat: string) {
  const catLower = cat.toLowerCase();
  const productForPrompt = title.replace(/["']/g, "").slice(0, 120);

  // 립스틱: face close-up with lip focus
  if (catLower.includes("lipstick") || catLower.includes("lip")) {
    return {
      hero: {
        prompt: `Young Asian female model wearing "${productForPrompt}" on lips, close-up portrait, studio cream paper background, soft natural window light, glossy lips visible, K-beauty editorial, sharp focus on lip texture and lipstick application, 4:5 portrait, ${NO_TEXT_FLAG}`,
        size: { w: 768, h: 1344 },
      },
      macro: {
        prompt: `Ultra close-up macro of "${productForPrompt}" lipstick bullet texture and color swatch, cream finish visible, natural daylight, K-beauty commercial still, shallow depth of field, square composition, ${NO_TEXT_FLAG}`,
        size: { w: 1024, h: 1024 },
      },
      trust: {
        prompt: `Young Asian female model wearing "${productForPrompt}", half-body shot in warm cafe natural light, relaxed candid smile, lip color visible, K-fashion editorial style, calm serene mood, warm neutrals, landscape composition, ${NO_TEXT_FLAG}`,
        size: { w: 1344, h: 768 },
      },
    };
  }

  // 아이섀도우/아이브로우/속눈썹: eye close-up focus
  if (catLower.includes("eyeshadow") || catLower.includes("eyebrow") || catLower.includes("eyelash") || catLower.includes("lash")) {
    return {
      hero: {
        prompt: `Young Asian female model with "${productForPrompt}" eye makeup, close-up portrait focusing on eyes, natural studio lighting, clean cream background, defined eye makeup visible, K-beauty editorial, 4:5 portrait, ${NO_TEXT_FLAG}`,
        size: { w: 768, h: 1344 },
      },
      macro: {
        prompt: `Macro close-up of "${productForPrompt}" eyeshadow palette or eyebrow pencil texture, product still life with soft cream studio styling, natural light, K-beauty commercial, square composition, ${NO_TEXT_FLAG}`,
        size: { w: 1024, h: 1024 },
      },
      trust: {
        prompt: `Young Asian female model with "${productForPrompt}" eye makeup, candid lifestyle shot in soft daylight, natural relaxed expression, visible eye makeup, K-fashion editorial, warm cream tones, landscape, ${NO_TEXT_FLAG}`,
        size: { w: 1344, h: 768 },
      },
    };
  }

  // 네일: hand close-up
  if (catLower.includes("nail")) {
    return {
      hero: {
        prompt: `Elegant female hands with "${productForPrompt}" nail art or nail polish, studio cream background, soft natural light, manicured nails visible, K-beauty editorial hand shot, 4:5 portrait, ${NO_TEXT_FLAG}`,
        size: { w: 768, h: 1344 },
      },
      macro: {
        prompt: `Ultra macro of "${productForPrompt}" nail polish texture and color, single droplet on clean surface, studio cream lighting, K-beauty commercial, square composition, ${NO_TEXT_FLAG}`,
        size: { w: 1024, h: 1024 },
      },
      trust: {
        prompt: `Elegant female hands showing "${productForPrompt}" manicured nails, relaxed lifestyle setting with coffee cup or phone, natural daylight, soft cream bokeh background, landscape, ${NO_TEXT_FLAG}`,
        size: { w: 1344, h: 768 },
      },
    };
  }

  // 가발: hair focus
  if (catLower.includes("wig") || catLower.includes("hair")) {
    return {
      hero: {
        prompt: `Young female model with "${productForPrompt}" hairstyle, studio portrait, professional hair styling visible, clean cream background, soft studio lighting, 4:5 portrait, ${NO_TEXT_FLAG}`,
        size: { w: 768, h: 1344 },
      },
      macro: {
        prompt: `Macro detail of "${productForPrompt}" hair texture, natural wave or curl visible, studio cream background, soft light, square composition, ${NO_TEXT_FLAG}`,
        size: { w: 1024, h: 1024 },
      },
      trust: {
        prompt: `Young female model with "${productForPrompt}", lifestyle outdoor setting in soft daylight, natural hair movement visible, editorial beauty photography, landscape, ${NO_TEXT_FLAG}`,
        size: { w: 1344, h: 768 },
      },
    };
  }

  // 기본 뷰티 (메이크업 세트, 브러쉬 등)
  return {
    hero: {
      prompt: `Young Asian female model with beauty look, studio cream paper background, soft window light, ${productForPrompt}, K-beauty editorial portrait, 4:5 portrait, ${NO_TEXT_FLAG}`,
      size: { w: 768, h: 1344 },
    },
    macro: {
      prompt: `Clean product still life of "${productForPrompt}", studio cream paper background, natural diffused light, K-beauty commercial product photography, square composition, ${NO_TEXT_FLAG}`,
      size: { w: 1024, h: 1024 },
    },
    trust: {
      prompt: `Young Asian female model in warm cafe natural light, ${productForPrompt}, relaxed beauty lifestyle, K-fashion editorial, warm cream tones, landscape, ${NO_TEXT_FLAG}`,
      size: { w: 1344, h: 768 },
    },
  };
}

const NO_TEXT_FLAG = "no label, no text, no watermark, no logo, no readable typography in frame";

// ============================================================
// SAMPLE3 HTML (beauty variant)
// ============================================================
function renderBeautyHtml(params: {
  title: string; titleSub: string; eyebrow: string; lead: string; price: string; meta: string; chip: string;
  doc: PdpStructured; assetPrefix: string; heroUrl: string; macroUrl: string; desireUrl: string; ogUrl: string;
  modelCast: ModelCastProfile; internalName: string; koCat: string;
}): string {
  const { title, titleSub, eyebrow, lead, price, meta, chip, doc, assetPrefix, heroUrl, macroUrl, desireUrl, ogUrl, modelCast, internalName, koCat } = params;
  const hi = `${assetPrefix}/${heroUrl}`, mi = `${assetPrefix}/${macroUrl}`, di = `${assetPrefix}/${desireUrl}`, oi = ogUrl;
  const usps = (doc.usps ?? ["", "", ""]).slice(0, 3);
  while (usps.length < 3) usps.push("");

  const DEFAULT_FAQ = [
    { q: "제품 타입은 어떻게 확인하나요?", a: "DETAILS 테이블에서 제품명과 내부코드를 확인하세요. 추가 문의는 LEXI 상담으로." },
    { q: "사용 시 주의사항이 있나요?", a: "소량 테스트 후 사용을 권장합니다. 자세한 성분 정보는 문의해 주세요." },
    { q: "배송·반품은?", a: "결제 확인 후 출고됩니다. 미개봉 시 안내된 기간 내 반품이 가능합니다." },
  ];
  let faqs: { q?: string; a?: string }[] = [];
  for (const f of (doc.faq ?? [])) {
    const q = f?.q?.trim() || "";
    const a = f?.a?.trim() || "";
    if (/^[가-힣]/.test(q) && /^[가-힣]|[가-힣]/.test(a)) faqs.push({ q, a });
  }
  while (faqs.length < 3) faqs.push(DEFAULT_FAQ[faqs.length]);

  const interestStr = (modelCast.interests ?? []).join(" · ");
  const stylings = stylingForProduct(chip);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} · LEXI</title>
<meta name="description" content="${titleSub} · LEXI Curated"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${title}"/><meta property="og:description" content="${titleSub} · LEXI Curated"/>
<meta property="og:image" content="${oi}"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${oi}"/>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1,h2,h3{text-wrap:balance;letter-spacing:0;font-style:normal}a{color:inherit;text-decoration:none}
.top{max-width:760px;margin:0 auto;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}
.nav{display:flex;gap:10px;align-items:center;font-size:12px;color:var(--fog)}
.chip{border:1px solid var(--ink);padding:5px 11px;border-radius:999px;color:var(--ink);font-weight:600}
.wrap{max-width:760px;margin:0 auto 56px;background:var(--paper);box-shadow:0 18px 50px rgba(0,0,0,.08)}
.brand-strip{padding:14px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--fog)}.brand-strip strong{color:var(--ink);font-weight:700}
.hero{padding:8px 0 0}.hero img{width:100%;display:block;aspect-ratio:4/5;object-fit:cover}
.hero-copy{padding:28px 24px 8px;text-align:center}
.eyebrow{font-size:11px;letter-spacing:.12em;color:var(--accent);font-weight:700;margin-bottom:10px}
.hero-copy h1{font-size:clamp(26px,5vw,34px);margin:0 0 10px;font-weight:800;line-height:1.25}
.sub{color:var(--fog);font-size:15px;margin:0 0 14px}.lead{max-width:38ch;margin:0 auto;color:var(--ink);font-size:14px;line-height:1.7}
.price-row{display:flex;justify-content:center;align-items:baseline;gap:12px;margin-top:18px}
.price{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}.meta{font-size:12px;color:var(--fog)}
.pad{padding:28px 24px}.section-kicker{font-size:11px;letter-spacing:.1em;color:var(--accent);font-weight:700;margin:0 0 8px}
.section-title{font-size:20px;margin:0 0 14px;font-weight:800}
.gallery{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;padding:8px 24px 8px}.gallery .tall{grid-row:span 2}
.gallery figure{margin:0;position:relative}.gallery img{width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;min-height:160px}
.gallery figcaption{position:absolute;left:10px;bottom:10px;background:rgba(26,26,26,.62);color:#fff;font-size:11px;padding:5px 9px;border-radius:999px;font-weight:600}
@media(max-width:640px){.gallery{grid-template-columns:1fr}.gallery .tall{grid-row:auto}}
.usps{list-style:none;margin:0;padding:0;display:grid;gap:12px}.usp{padding:16px;border:1px solid var(--line);border-radius:14px;display:grid;gap:6px;background:#fff}
.usp strong{font-size:14px}.usp span{font-size:13px;color:var(--fog);line-height:1.6}
.story p{margin:0 0 12px;font-size:14px;line-height:1.75}.story p:last-child{margin-bottom:0}
.styling{margin:0;padding-left:18px}.styling li{margin:8px 0;font-size:14px}
.spec{width:100%;border-collapse:collapse;font-size:13px}.spec th,.spec td{padding:11px 12px;border:1px solid var(--line);text-align:left}.spec th{background:#fff;width:34%;font-weight:700}
.faq{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 10px;background:#fff}.faq summary{font-weight:700;cursor:pointer}.faq p{margin:10px 0 0;color:var(--fog);font-size:13px;line-height:1.65}
.brand-note{margin-top:18px;padding:16px;border-left:3px solid var(--accent);background:#fff;font-size:13px;line-height:1.65}
.cta-band{padding:32px 24px 40px;text-align:center;background:linear-gradient(180deg,#faf9f7 0%,#f3efe6 100%)}
.cta{display:inline-block;background:var(--accent);color:#fff;font-weight:800;padding:15px 42px;border-radius:14px;font-size:15px}.cta-sub{margin-top:12px;font-size:12px;color:var(--fog)}
.foot{max-width:760px;margin:0 auto 40px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
.model-card{padding:18px 16px;border:1px solid var(--line);border-radius:14px;background:#fff;font-size:13px;line-height:1.65;color:var(--fog)}.model-card strong{color:var(--ink)}
.model-profile{display:grid;gap:10px;margin:0;padding:0;list-style:none}.model-profile li{display:grid;grid-template-columns:88px 1fr;gap:10px;align-items:baseline}
.model-profile .k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--fog);font-weight:700}.model-profile .v{color:var(--ink);font-size:14px}
.model-agency{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--fog)}.model-agency b{color:var(--ink)}
.og-card{margin:0}.og-card img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--line);aspect-ratio:1200/630;object-fit:cover;background:#fff}
</style></head>
<body>
<header class="top"><div class="logo">LEXI<span>.</span></div><div class="nav"><span>Beauty</span><span class="chip">뷰티 · SAMPLE3</span></div></header>
<article class="wrap">
  <div class="brand-strip"><div><strong>LEXI</strong> · LEXI Curated</div><div>Curated by LEXI · ${title.slice(0, 28)}</div></div>
  <section class="hero">
    <img src="${hi}" alt="${title} — ${modelCast.name} wearing"/>
    <div class="hero-copy">
      <div class="eyebrow">${eyebrow}</div>
      <h1>${title}</h1>
      <p class="sub">${titleSub}</p>
      <p class="lead">${lead}</p>
      <div class="price-row"><div class="price">${price}</div><div class="meta">${meta}</div></div>
    </div>
  </section>
  <div class="gallery">
    <figure class="tall"><img src="${hi}" alt=""/><figcaption>Hero</figcaption></figure>
    <figure><img src="${mi}" alt=""/><figcaption>Detail</figcaption></figure>
    <figure><img src="${di}" alt=""/><figcaption>Desire</figcaption></figure>
  </div>
  <section class="pad">
    <p class="section-kicker">MODEL CAST</p>
    <h2 class="section-title">이 상품의 화보 모델</h2>
    <div class="model-card">
      <ul class="model-profile">
        <li><span class="k">이름</span><span class="v">${modelCast.name}</span></li>
        <li><span class="k">성별</span><span class="v">${modelCast.gender}</span></li>
        <li><span class="k">국적</span><span class="v">${modelCast.nationality}</span></li>
        ${interestStr ? `<li><span class="k">관심사</span><span class="v">${interestStr}</span></li>` : ""}
      </ul>
      <div class="model-agency">소속사 <b>${modelCast.agency}</b> <span style="color:var(--fog)">(${modelCast.agencyFull})</span></div>
    </div>
  </section>
  <section class="pad og-preview" data-block="og">
    <p class="section-kicker">SHARE · OG</p>
    <h2 class="section-title">LEXI OG 이미지</h2>
    <figure class="og-card"><img src="${oi}" alt="${title}" width="1200" height="630"/></figure>
  </section>
  <section class="pad">
    <p class="section-kicker">WHY LEXI</p>
    <h2 class="section-title">세 가지로 정리한 포인트</h2>
    <ul class="usps">
      <li class="usp"><strong>${usps[0] || "LEXI 검증 — 큐레이티드"}</strong><span>${doc.descriptionHtml ? doc.descriptionHtml.replace(/<[^>]+>/g, "").slice(0, 80) : "LEXI 검증 소싱과 프리미엄 품질."}</span></li>
      <li class="usp"><strong>${usps[1] || "부담 없는 가격"}</strong><span>데일리부터 특별한 날까지 자연스럽게.</span></li>
      <li class="usp"><strong>${usps[2] || "LEXI 큐레이션"}</strong><span>투명한 가격과 검증된 품질.</span></li>
    </ul>
  </section>
  <section class="pad story" style="padding-top:8px">
    <p class="section-kicker">STORY</p>
    <h2 class="section-title">LEXI가 고른 오늘의 아이템</h2>
    <p>${title} — LEXI만의 기준으로 엄선한 뷰티 아이템. 화보와 실제 사용감 모두에서 과장 없는 만족을 목표로 했습니다.</p>
    <p>메이크업 루틴의 중심, LEXI가 제안하는 뷰티 편집.</p>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">STYLING</p>
    <h2 class="section-title">스타일링 노트</h2>
    <ul class="styling">${stylings.map((s) => `<li>${s}</li>`).join("")}</ul>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>LEXI</td></tr>
      <tr><th>Product</th><td>${title}</td></tr>
      <tr><th>Internal name</th><td>${internalName.slice(0, 60)}</td></tr>
      <tr><th>Type</th><td>${koCat}</td></tr>
      <tr><th>Category</th><td>${chip}</td></tr>
      <tr><th>Season</th><td>올시즌</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</div>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${faqs.map((f) => `<details class="faq"><summary>${f.q}</summary><p>${f.a}</p></details>`).join("\n    ")}
  </section>
  <section class="cta-band">
    <a class="cta" href="#cart">LEXI 장바구니 담기</a>
    <p class="cta-sub">LEXI Curated · Free shipping info at checkout</p>
  </section>
</article>
<p class="foot">© LEXI · 뷰티 · SAMPLE3</p>
</body></html>`;
}

// ============================================================
// OG image generation
// ============================================================
async function generateOgImage(heroBuf: Buffer, title: string, outPath: string): Promise<void> {
  const og = await sharp(heroBuf)
    .resize(1200, 630, { fit: "cover", position: "center" })
    .webp({ quality: 80, alphaQuality: 80, effort: 4 })
    .toBuffer();
  writeFileSync(outPath, og);
  console.log(`  ✓ OG: 1200×630 ${(og.length/1024).toFixed(1)}KB WebP`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  const listOnly = process.argv.includes("--list");
  const batchSize = parseInt(process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? "1", 10);
  const catalogIdArg = process.argv.find((a) => a.startsWith("--catalogId="));
  const catalogId = catalogIdArg ? parseInt(catalogIdArg.split("=")[1], 10) : 0;
  const noImage = process.argv.includes("--no-image");

  // 목록 보기
  if (listOnly) {
    const rows = listBeautyProducts();
    console.log(`\n=== 뷰티 상품 목록 (${rows.length}개) ===\n`);
    rows.slice(0, 30).forEach((r: any, i: number) => {
      const cat = (r.categoryPath ?? []).join(" > ");
      const sell = computeSellPrice(parseFloat(r.minPrice ?? "0") || 0);
      console.log(`  [${String(i).padEnd(2)}] id=${String(r.id).padEnd(5)} | $${String(r.minPrice).padEnd(6)} → $${sell.toFixed(1).padEnd(7)} | ${cat.padEnd(20)} | ${(r.title ?? "?").slice(0, 40)}`);
    });
    return;
  }

  // 배치 모드
  const idsToProcess: number[] = [];
  if (catalogId > 0) {
    idsToProcess.push(catalogId);
  } else {
    const rows = listBeautyProducts();
    const count = Math.min(batchSize, rows.length);
    if (count === 0) {
      console.log("뷰티 상품 없음. --list로 확인하세요.");
      process.exit(0);
    }
    for (let i = 0; i < count; i++) {
      idsToProcess.push(rows[i].id);
    }
  }

  console.log(`\n=== 처리 대상: ${idsToProcess.length}개 뷰티 상품 ===\n`);

  for (let idx = 0; idx < idsToProcess.length; idx++) {
    const currentId = idsToProcess[idx];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`>>> [${idx + 1}/${idsToProcess.length}] catalogId=${currentId}`);

    const row = getCatalogRow(currentId);
    if (!row) { console.log(`  ⚠ id ${currentId} 없음, skip`); continue; }
    if (!row.primaryThumbUrl) { console.log(`  ⚠ 썸네일 없음, skip`); continue; }

    const externalId = String(row.externalId);
    const chipRaw = (row.categoryPath ?? []).find((c: string) => BEAUTY_CATS.includes(c)) || "Makeup";
    const chip = chipRaw; // 영문 CJ 카테고리 그대로 사용
    const koCat = koBeautyCategory(chipRaw);
    const sell = computeSellPrice(parseFloat(row.minPrice ?? "0") || 0);
    const slug = slugify(row.title, externalId);
    const outDir = path.join(SAMPLE3_BASE, `mock-beauty-${slug}`);
    const assetsDir = path.join(outDir, "assets");

    console.log(`    ${row.title}`);
    console.log(`    CJ: $${row.minPrice} → 판매 $${sell.toFixed(1)} | ${chip}(${koCat})`);
    console.log(`    Out: ${outDir}`);

    mkdirSync(assetsDir, { recursive: true });

    // === AMBA 모델 매칭 ===
    let modelProfile: ModelCastProfile = {
      name: "LEXI Ambassador",
      gender: "여성",
      nationality: "대한민국",
      interests: ["뷰티", "메이크업"],
      agency: "AMBA",
      agencyFull: "AI Ambassador",
      faceSeed: "",
    };

    try {
      const casts = (await import("../src/lib/pdp/amba-casts")).listAmbaCasts();
      if (casts.length > 0) {
        // 뷰티: 여성 모델, EA(동아시아) 선호
        let pool = casts.filter((c: AmbaCast) => c.source?.sex === "F");
        if (pool.length > 0) {
          const ea = pool.filter((c: AmbaCast) => c.source?.eth === "EA");
          if (ea.length > 0) pool = ea;
        } else { pool = casts; }
        // 결정론적 선택
        const pickIdx = Number(row.id) % pool.length;
        const ambaCast = pool[pickIdx] ?? casts[0];
        if (ambaCast) {
          modelProfile = toModelCast(ambaCast);
          console.log(`  ✓ Model: ${modelProfile.name} (${ambaCast.nationality})`);
        }
      }
    } catch { /* use default profile */ }

    // === STEP 1: FLUX 이미지 생성 ===
    const useFlux = !noImage;
    let heroBuf: Buffer | null = null;
    let macroBuf: Buffer | null = null;
    let desireBuf: Buffer | null = null;

    if (useFlux) {
      console.log("\n--- AI Image Generation (ComfyUI FLUX.1 schnell) ---");

      const plan = buildBeautyImagePlan(row.title, chip);

      // S1 Hero
      const heroSeed = Number(row.id) * 100 + 1;
      const heroResult = await generateFluxImage(plan.hero.prompt, plan.hero.size.w, plan.hero.size.h, heroSeed, "S1 Hero");
      if (heroResult) {
        heroBuf = heroResult;
        const opt = await sharpOptimize(heroBuf, 960, 1200, 78, "hero optimized");
        writeFileSync(path.join(assetsDir, "s1-hero-opt.webp"), opt);
      }

      // S2 Macro
      const macroSeed = Number(row.id) * 100 + 2;
      const macroResult = await generateFluxImage(plan.macro.prompt, plan.macro.size.w, plan.macro.size.h, macroSeed, "S2 Macro");
      if (macroResult) {
        macroBuf = macroResult;
        const opt = await sharpOptimize(macroBuf, 720, 720, 78, "macro optimized");
        writeFileSync(path.join(assetsDir, "s2-detail-opt.webp"), opt);
      }

      // S3 Desire
      const desireSeed = Number(row.id) * 100 + 3;
      const desireResult = await generateFluxImage(plan.trust.prompt, plan.trust.size.w, plan.trust.size.h, desireSeed, "S3 Desire");
      if (desireResult) {
        desireBuf = desireResult;
        const opt = await sharpOptimize(desireBuf, 960, 1200, 78, "trust optimized");
        writeFileSync(path.join(assetsDir, "s3-desire-opt.webp"), opt);
      }
    }

    // === FLUX 실패 폴백: CJ sharp ===
    if (!noImage) {
      const needsCjDownload = !heroBuf || !macroBuf || !desireBuf;
      if (needsCjDownload) {
        console.log("  ℹ Using CJ source fallback for missing images...");
        const sourceBuf = await downloadBuf(row.primaryThumbUrl);
        writeFileSync(path.join(assetsDir, "source-thumb.jpg"), sourceBuf);

        if (!heroBuf) {
          heroBuf = await sharpOptimize(sourceBuf, 960, 1200, 78, "hero CJ fallback");
          writeFileSync(path.join(assetsDir, "s1-hero-opt.webp"), heroBuf);
        }
        if (!macroBuf) {
          macroBuf = await sharpOptimize(sourceBuf, 720, 720, 78, "macro CJ fallback");
          writeFileSync(path.join(assetsDir, "s2-detail-opt.webp"), macroBuf);
        }
        if (!desireBuf) {
          desireBuf = await sharpOptimize(sourceBuf, 960, 1200, 78, "desire CJ fallback");
          writeFileSync(path.join(assetsDir, "s3-desire-opt.webp"), desireBuf);
        }
      }

      // OG
      await generateOgImage(heroBuf!, row.title, path.join(outDir, "og-opt.webp"));
    }

    // === STEP 2: 텍스트 생성 (한국어) ===
    console.log("\n--- Text Generation ---");
    let doc: PdpStructured = {
      title: row.title,
      subtitle: "",
      descriptionHtml: "",
      usps: ["LEXI 검증 — 엄선된 뷰티 아이템", "부담 없는 프리미엄 소싱", "투명한 가격과 검증된 품질"],
      faq: [
        { q: "제품 타입은 어떻게 확인하나요?", a: "DETAILS 테이블에서 제품명과 정보를 확인하세요." },
        { q: "사용 시 주의사항이 있나요?", a: "소량 테스트 후 사용을 권장합니다." },
        { q: "배송·반품은?", a: "결제 확인 후 출고. 미개봉 시 반품 가능합니다." },
      ],
      ctaLabel: "LEXI 장바구니 담기",
      seoKeywords: ["LEXI", row.title, "뷰티", koCat],
      galleryAssetIndexes: [0, 1, 2],
    };

    try {
      const result = await generatePdpText({
        title: row.title,
        category: chip,
        price: `USD ${sell.toFixed(1)}`,
        seller: row.sellerName ?? "LEXI Sourced",
        locale: "ko",
        assetUrls: [],
        copyRuleset: JSON.stringify({
          rulesetId: "SAMPLE3-BEAUTY",
          description: "뷰티 SAMPLE3 카피",
          tonePrefix: "quiet editorial beauty",
          noFakeClaims: true,
        }),
      });
      doc = result.doc;
      console.log(`  ✓ text: ${result.engine}${result.model ? " (" + result.model + ")" : ""}`);
    } catch (e) {
      console.log("  ℹ template fallback");
    }

    // === STEP 3: 한국어 마케팅명 생성 ===
    const titleMarketing = koBeautyTitle(row.title, chip);

    // === STEP 4: SAMPLE3 HTML 조립 ===
    console.log("\n--- HTML Assembly ---");
    const html = renderBeautyHtml({
      title: titleMarketing,
      titleSub: `${koCat} — LEXI가 엄선한 뷰티`,
      eyebrow: koBeautyEyebrow(koCat),
      lead: leadForProduct(row.title, chip),
      price: `USD ${sell.toFixed(1)}`,
      meta: koCat,
      chip,
      doc,
      assetPrefix: "./assets",
      heroUrl: "s1-hero-opt.webp",
      macroUrl: "s2-detail-opt.webp",
      desireUrl: "s3-desire-opt.webp",
      ogUrl: "./og-opt.webp",
      modelCast: modelProfile,
      internalName: row.title,
      koCat,
    });

    writeFileSync(path.join(outDir, "index.html"), html, "utf8");

    // === STEP 5: meta.json ===
    const meta = {
      mockId: `mock-beauty-${slug}`,
      styleId: "SAMPLE3",
      status: "draft-mock",
      category: "beauty",
      ruleset: {
        faceLock: "S1→S2→S3 same model face (or product focus)",
        onImageText: "en",
        bodyCopy: "locale ko",
        titleInternal: "CJ original in DETAILS table only",
        titleMarketing: "short regenerated external name",
      },
      catalog: {
        id: row.id,
        externalId,
        titleInternal: row.title,
        titleMarketing: { ko: titleMarketing, en: row.title },
        categoryPath: row.categoryPath ?? [chip],
        costUsd: parseFloat(row.minPrice ?? "0"),
        sellUsd: parseFloat(sell.toFixed(1)),
        sourceThumb: "./assets/source-thumb.jpg",
      },
      modelCast: {
        id: modelProfile.id ?? "",
        name: modelProfile.name,
        gender: modelProfile.gender,
        nationality: modelProfile.nationality,
        interests: modelProfile.interests,
        agency: modelProfile.agency,
        agencyFull: modelProfile.agencyFull,
        faceSeed: modelProfile.faceSeed,
      },
      assets: {
        hero: "./assets/s1-hero-opt.webp",
        macro: "./assets/s2-detail-opt.webp",
        desire: "./assets/s3-desire-opt.webp",
        og: "./og-opt.webp",
      },
      previewPath: `/sample3/mock-beauty-${slug}/`,
    };

    writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

    console.log(`\n✓ 완료: ${titleMarketing}`);
    console.log(`  HTML: ${path.join(outDir, "index.html")}`);
    console.log(`  Preview: /sample3/mock-beauty-${slug}/`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`=== ALL DONE: ${idsToProcess.length} beauty PDPs ===`);
}

// ============================================================
// Korean title generation for beauty
// ============================================================
function koBeautyTitle(title: string, cat: string): string {
  const t = title.toLowerCase();
  const catLower = cat.toLowerCase();

  // Try to extract a short Korean name based on product type
  if (catLower.includes("lipstick") || catLower.includes("lip")) {
    if (t.includes("matte")) return "매트 립스틱";
    if (t.includes("gloss") || t.includes("glaze") || t.includes("glow")) return "글로우 립글로즈";
    if (t.includes("ice") || t.includes("mirror")) return "아이스 미러 립스틱";
    return "립스틱";
  }

  if (catLower.includes("eyebrow") || catLower.includes("brow")) {
    if (t.includes("tint")) return "롱래스팅 아이브로우 틴트";
    if (t.includes("pencil") || t.includes("pen")) return "아이브로우 펜슬";
    return "아이브로우";
  }

  if (catLower.includes("eyelash") || catLower.includes("lash")) {
    if (t.includes("5d") || t.includes("volume")) return "5D 볼륨 래쉬";
    return "속눈썹 익스텐션";
  }

  if (catLower.includes("nail")) {
    if (t.includes("gel") || t.includes("polish")) return "네일 젤 폴리쉬";
    if (t.includes("strength") || t.includes("strengthen")) return "네일 강화제";
    if (t.includes("tip")) return "네일 팁";
    return "네일 케어";
  }

  if (catLower.includes("eyeshadow")) {
    if (t.includes("palette")) return "아이섀도우 팔레트";
    if (t.includes("stick")) return "아이섀도우 스틱";
    return "아이섀도우";
  }

  if (catLower.includes("wig") || catLower.includes("hair")) {
    if (t.includes("lace front") || t.includes("lace")) return "레이스 프론트 가발";
    if (t.includes("bob")) return "밥 가발";
    if (t.includes("ponytail")) return "포니테일 가발";
    if (t.includes("cosp")) return "코스프레 가발";
    return "가발";
  }

  if (catLower.includes("makeup set") || catLower.includes("make up")) {
    return "메이크업 세트";
  }

  // Fallback: pick key English words and translate
  const koFallback = title
    .replace(/^\d+[- ]/, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
  return koFallback ? `${koFallback} · 뷰티` : "LEXI 뷰티 아이템";
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});