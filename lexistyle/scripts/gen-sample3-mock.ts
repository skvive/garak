#!/usr/bin/env npx tsx
/**
 * SAMPLE3 PDP 1건 생성 — AMBA 모델 착용샷 (ComfyUI FLUX) + SAMPLE3 HTML
 *
 * 사용법:
 *   npx tsx scripts/gen-sample3-mock.ts --catalogId=20            # 1건 생성
 *   npx tsx scripts/gen-sample3-mock.ts --catalogId=29 --no-image # 이미지 스킵 (텍스트+HTML만)
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
import { pickAmbaCast, toModelCast, castFaceFsPath } from "../src/lib/pdp/amba-casts";
import type { AmbaCast, ModelCastProfile } from "../src/lib/pdp/amba-casts";
import { buildMarketingImagePlan } from "../src/lib/pdp/marketing-prompt";

// === Config ===
const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const SAMPLE3_BASE = path.join(process.cwd(), "public", "sample3");
const COMFY_BASE = "http://127.0.0.1:8188";
const COMFY_TIMEOUT_MS = 300_000;

function getStore() {
  return JSON.parse(readFileSync(STORE, "utf8"));
}

function getCatalogRow(id: number) {
  const s = getStore();
  return (s.catalog ?? []).find((r: any) => Number(r.id) === id) ?? null;
}

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
  return `${base || "item"}-${String(externalId).slice(-8)}`.slice(0, 48);
}

/** 카테고리 raw → 고객 노출 한국어 라벨 (CJ/카테고리 ID 노출 금지) */
const KO_CATEGORY: { re: RegExp; ko: string }[] = [
  { re: /dress/i, ko: "원피스" },
  { re: /skirt/i, ko: "스커트" },
  { re: /blouse|top/i, ko: "블라우스 · 탑" },
  { re: /sweater|knit|cardigan/i, ko: "니트 · 스웨터" },
  { re: /pants|trousers|jeans|denim|legging/i, ko: "팬츠 · 데님" },
  { re: /coat|jacket|outer|blazer|trench/i, ko: "코트 · 자켓" },
  { re: /women|woman/i, ko: "여성" },
  { re: /casual/i, ko: "캐주얼" },
];

function koCategoryLabel(chip: string): string {
  for (const c of KO_CATEGORY) {
    if (c.re.test(chip)) return c.ko;
  }
  return "패션";
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** SAMPLE3 지침: titleMarketing = 간결·센스 있는 한국어 마케팅명 (H1/OG용). Internal name은 CJ 원제 유지. */
const KO_TITLE_PATTERNS: { re: RegExp; ko: string }[] = [
  { re: /chiffon/i, ko: "시폰" },
  { re: /floral|flower/i, ko: "플라워" },
  { re: /midi dress/i, ko: "*미디*원피스" }, // *토큰 = 카테고리로 취급
  { re: /long[ -]?sleeved/i, ko: "롱슬리브" },
  { re: /mini dress/i, ko: "*미니*원피스" },
  { re: /wrap dress|wrap front/i, ko: "*랩*원피스" },
  { re: /jersey/i, ko: "저지" },
  { re: /satin/i, ko: "새틴" },
  { re: /button[ -]?up/i, ko: "버튼업" },
  { re: /blouse/i, ko: "블라우스" },
  { re: /pullover|sweater/i, ko: "스웨터" },
  { re: /chunky|knit/i, ko: "니트" },
  { re: /wide[ -]?leg/i, ko: "와이드" },
  { re: /trousers|pants/i, ko: "팬츠" },
  { re: /high[ -]?waist/i, ko: "하이웨이스트" },
  { re: /double[ -]?breasted/i, ko: "더블 브레스트" },
  { re: /trench coat/i, ko: "*트렌치*코트" },
  { re: /coat/i, ko: "코트" },
  { re: /faux leather|leather/i, ko: "레더" },
  { re: /straight[ -]?leg/i, ko: "스트레이트" },
  { re: /boned|corset/i, ko: "코르셋" },
  { re: /camisole/i, ko: "캐미솔" },
  { re: /top/i, ko: "탑" },
  { re: /tailored/i, ko: "테일러드" },
  { re: /sleeveless/i, ko: "슬리브리스" },
  { re: /vest/i, ko: "베스트" },
  { re: /denim/i, ko: "데님" },
  { re: /cropped/i, ko: "크롭" },
  { re: /jacket/i, ko: "자켓" },
  { re: /vintage|wash/i, ko: "빈티지 워싱" },
  { re: /dress/i, ko: "원피스" },
  { re: /skirt/i, ko: "스커트" },
  { re: /fashion/i, ko: "패션" },
];

const KO_CATEGORY_GROUP = ["원피스", "스커트", "블라우스", "스웨터", "팬츠", "코트", "자켓", "베스트", "탑"];

function toKoreanTitle(title: string, chip: string): string {
  const t = title;
  const tokens: string[] = [];
  for (const p of KO_TITLE_PATTERNS) {
    if (p.re.test(t)) tokens.push(p.ko);
  }
  // *카테고리* 패턴(복합)을 head/tail로 분리
  const head: string[] = [];
  let tail = "";
  for (const raw of tokens) {
    if (raw.startsWith("*")) {
      const parts = raw.split("*").filter(Boolean);
      if (parts.length >= 2) {
        if (!head.includes(parts[0])) head.push(parts[0]);
        if (!tail) tail = parts[1];
        continue;
      }
    }
    if (KO_CATEGORY_GROUP.includes(raw)) {
      if (!tail) tail = raw;
      // tail이 이미 정해진 뒤의 카테고리 토큰(중복)은 버림
      continue;
    }
    if (!head.includes(raw)) head.push(raw);
  }
  const headFinal = head.slice(0, 3);
  const joined = [...headFinal, tail].filter(Boolean).join(" ");
  if (joined.length > 0) return joined;
  return /원피스/.test(chip) ? "LEXI 원피스" : "LEXI 스타일 아이템";
}

// === AMBA 모델 매칭 ===
function matchModelForProduct(row: any, casts: AmbaCast[]): AmbaCast | null {
  if (!casts.length) return null;
  const catPath = (row.categoryPath ?? []).join(" ");
  const title = (row.title ?? "").toLowerCase();

  // 여성 의류 → 여성 모델
  const isWomens = /dress|blouse|skirt|women|bra|lingerie|fashion|top|blazer|cardigan|coat|jacket|knit|pants|jeans|jumpsuit|romper|swimwear/i.test(title + catPath);
  const sex = "F"; // fashion default: female model

  // 모델 풀: sex 기준 직접 필터링
  let pool = casts.filter((c) => c.source?.sex === sex);
  if (!pool.length) pool = casts;

  // EA 여성 선호
  if (sex === "F") {
    const ea = pool.filter((c) => c.source?.eth === "EA");
    if (ea.length > 0) pool = ea;
  }

  // 결정론적 선택
  const idx = row.id ? Number(row.id) % pool.length : 0;
  return pool[idx] ?? casts[0] ?? null;
}

// === ComfyUI API 호출 ===
async function comfyPrompt(workflow: any): Promise<string> {
  const res = await fetch(`${COMFY_BASE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ComfyUI prompt ${res.status}: ${text.slice(0, 200)}`);
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
    } catch {
      // still processing
    }
  }
  throw new Error(`ComfyUI timeout (${Math.round(maxWaitMs/1000)}s)`);
}

// === FLUX.1 schnell로 AI 패션 이미지 생성 ===
function buildFluxWorkflow(
  promptText: string,
  width: number,
  height: number,
  seed: number,
): any {
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
    "8": { class_type: "SaveImage", inputs: { filename_prefix: "lexi-flux-", images: ["7", 0] } },
  };
}

async function generateFluxImage(
  promptText: string,
  width: number,
  height: number,
  seed: number,
  label: string,
): Promise<{ buffer: Buffer; comfyUrl: string } | null> {
  try {
    const wf = buildFluxWorkflow(promptText, width, height, seed);
    const pid = await comfyPrompt(wf);
    const buf = await comfyWaitImage(pid);
    console.log(`  ✓ FLUX ${label}: ${buf.length} bytes`);
    return { buffer: buf, comfyUrl: `${COMFY_BASE}/view?filename=lexi-flux-` };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 80) : "unknown";
    console.warn(`  ⚠ FLUX ${label} failed: ${msg}`);
    return null;
  }
}

// === SAMPLE3 HTML 생성 ===
function renderSample3Html(params: {
  title: string; titleSub: string; eyebrow: string; lead: string; price: string; meta: string; chip: string;
  doc: PdpStructured; assetPrefix: string; heroUrl: string; macroUrl: string; desireUrl: string; ogUrl: string;
  modelCast: ModelCastProfile; internalName: string;
}): string {
  const { title, titleSub, eyebrow, lead, price, meta, chip, doc, assetPrefix, heroUrl, macroUrl, desireUrl, ogUrl, modelCast, internalName } = params;
  const hi = `${assetPrefix}/${heroUrl}`, mi = `${assetPrefix}/${macroUrl}`, di = `${assetPrefix}/${desireUrl}`, oi = ogUrl;
  const usps = (doc.usps ?? ["", "", ""]).slice(0, 3);
  while (usps.length < 3) usps.push("");
  // FAQ: locale 한국어 기본값 유지 (template 폴백의 영어 문구는 고객 노출 부적합)
  const DEFAULT_FAQ = [
    { q: "사이즈는 어떻게 고르나요?", a: "평소 사이즈를 기준으로 선택하세요. 사이즈 문의는 LEXI 상담으로 도와드립니다." },
    { q: "세탁·관리는?", a: "소재에 맞는 세탁법을 참고하고, 찬물 세탁과 자연 건조를 권장합니다." },
    { q: "배송·반품은?", a: "결제 확인 후 출고됩니다. 미사용·택 유지 시 안내된 기간 내 반품이 가능합니다." },
  ];
  let faqs: { q?: string; a?: string }[] = [];
  for (const f of (doc.faq ?? [])) {
    const q = f?.q?.trim() || "";
    const a = f?.a?.trim() || "";
    // 한국어(가나다라) 질문만 채택 — 영문 템플릿/Supplier 문구 배제
    if (/^[가-힣]/.test(q) && /^[가-힣]|[가-힣]/.test(a)) faqs.push({ q, a });
  }
  if (faqs.length < 3) {
    for (const d of DEFAULT_FAQ) {
      if (faqs.length >= 3) break;
      if (!faqs.some((x) => x.q === d.q)) faqs.push(d);
    }
  }
  faqs = faqs.slice(0, 3);
  const interestStr = (modelCast.interests ?? []).join(" · ");
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
<header class="top"><div class="logo">LEXI<span>.</span></div><div class="nav"><span>Women's Fashion</span><span class="chip">${chip} · SAMPLE3</span></div></header>
<article class="wrap">
  <div class="brand-strip"><div><strong>LEXI</strong> · LEXI Curated</div><div>Curated by LEXI · ${truncate(title, 28)}</div></div>
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
      <li class="usp"><strong>${usps[0] || "프리미엄 패션"}</strong><span>${doc.descriptionHtml ? doc.descriptionHtml.replace(/<[^>]+>/g, "").slice(0, 80) : "LEXI 검증 소싱과 정교한 디자인."}</span></li>
      <li class="usp"><strong>${usps[1] || "편안한 핏"}</strong><span>데일리부터 특별한 날까지 자연스럽게.</span></li>
      <li class="usp"><strong>${usps[2] || "LEXI 큐레이션"}</strong><span>투명한 가격과 검증된 품질.</span></li>
    </ul>
  </section>
  <section class="pad story" style="padding-top:8px">
    <p class="section-kicker">STORY</p>
    <h2 class="section-title">LEXI가 고른 오늘의 아이템</h2>
    <p>${title} — 익숙한 실루엣 위에 LEXI만의 감각을 더했습니다. 사진과 실착 모두에서 과장 없는 설렘을 목표로 했습니다.</p>
    <p>가벼운 레이어링부터 단독 착용까지, 옷장의 중심이 되는 조각입니다. 브랜드 문법의 중심은 언제나 LEXI.</p>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">STYLING</p>
    <h2 class="section-title">스타일링 노트</h2>
    <ul class="styling"><li>화이트 스니커즈 + 미니 크로스백 — 주말 카페 룩</li><li>베이지 트렌치 + 로퍼 — 봄·가을 외출</li><li>얇은 니트 가디건 + 플랫 — 오피스 캐주얼</li></ul>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>LEXI</td></tr>
      <tr><th>Product</th><td>${title}</td></tr>
      <tr><th>Internal name</th><td>${truncate(internalName, 60)}</td></tr>
      <tr><th>Fit</th><td>${meta}</td></tr>
      <tr><th>Category</th><td>${chip}</td></tr>
      <tr><th>Season</th><td>올시즌 데일리</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</div>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${faqs.map((f) => `<details class="faq"><summary>${f.q || "사이즈는 어떻게 고르나요?"}</summary><p>${f.a || "평소 사이즈를 기준으로 선택하세요. 사이즈 문의는 LEXI 상담으로 도와드립니다."}</p></details>`).join("\n    ")}
  </section>
  <section class="cta-band">
    <a class="cta" href="#cart">LEXI 장바구니 담기</a>
    <p class="cta-sub">LEXI Curated · Free shipping info at checkout</p>
  </section>
</article>
<p class="foot">© LEXI · ${chip} · SAMPLE3</p>
</body></html>`;
}

// === OG 이미지 생성 ===
async function generateOgImage(heroBuf: Buffer, title: string, outPath: string): Promise<void> {
  const og = await sharp(heroBuf)
    .resize(1200, 630, { fit: "cover", position: "center" })
    .webp({ quality: 80, alphaQuality: 80, effort: 4 })
    .toBuffer();
  writeFileSync(outPath, og);
  console.log(`  ✓ OG: 1200×630 ${(og.length/1024).toFixed(1)}KB WebP`);
}

// === Main ===
async function main() {
  const catalogIdArg = process.argv.find((a) => a.startsWith("--catalogId="));
  const catalogId = parseInt(catalogIdArg?.split("=")[1] ?? "20", 10);
  const noImage = process.argv.includes("--no-image");

  const row = getCatalogRow(catalogId);
  if (!row) throw new Error(`catalog ${catalogId} not found`);
  if (!row.primaryThumbUrl) throw new Error("no thumb URL");

  const externalId = String(row.externalId);
  const chipRaw = row.categoryPath?.[0] ?? "Fashion";
  const chip = koCategoryLabel(chipRaw);
  const sell = computeSellPrice(parseFloat(row.minPrice ?? "0") || 0);
  const slug = slugify(row.title, externalId);
  const outDir = path.join(SAMPLE3_BASE, `mock-${slug}`);
  const assetsDir = path.join(outDir, "assets");

  console.log(`\n=== SAMPLE3 PDP: [${catalogId}] ${row.title}`);
  console.log(`    CJ: $${row.minPrice} → 판매가 $${sell.toFixed(1)} | ${chip}`);
  console.log(`    Out: ${outDir}`);

  mkdirSync(assetsDir, { recursive: true });

  // ============================================================
  // STEP 0: AMBA 모델 매칭
  // ============================================================
  let ambaCast: AmbaCast | null = null;
  let modelProfile: ModelCastProfile = {
    name: "LEXI Ambassador",
    gender: "여성",
    nationality: "대한민국",
    interests: ["패션", "뷰티"],
    agency: "AMBA",
    agencyFull: "AI Ambassador",
    faceSeed: "",
  };

  try {
    const { listAmbaCasts } = await import("../src/lib/pdp/amba-casts");
    const casts = listAmbaCasts();
    if (casts.length > 0) {
      ambaCast = matchModelForProduct(row, casts);
      if (ambaCast) {
        modelProfile = toModelCast(ambaCast);
        const ethCode = ambaCast.source?.eth ?? "";
        console.log(`  ✓ Model: ${modelProfile.name} (${ambaCast.nationality}, ${ethCode})`);
      }
    }
  } catch {
    console.log("  ℹ AMBA model list unavailable, using default profile");
  }

  // ============================================================
  // STEP 1: 이미지 — FLUX AI 모델 착용샷 (또는 CJ sharp 폴백)
  // ============================================================
  const useFlux = !noImage;
  let heroBuf: Buffer | null = null;
  let macroBuf: Buffer | null = null;
  let desireBuf: Buffer | null = null;

  if (useFlux) {
    console.log("\n--- AI Image Generation (ComfyUI FLUX.1 schnell) ---");

    const plan = buildMarketingImagePlan({
      title: row.title,
      category: chip,
    });

    // 각 액트 독립 생성 + 개별 CJ 폴백
    // S1 Hero: 4:5 portrait
    const heroSeed = Number(catalogId) * 100 + 1;
    const heroResult = await generateFluxImage(plan[0].prompt + " full-body portrait, cream paper studio background, fashion editorial", 768, 1344, heroSeed, "S1 Hero");
    if (heroResult) {
      heroBuf = heroResult.buffer;
      const opt = await sharpOptimize(heroBuf, 960, 1200, 78, "hero optimized");
      writeFileSync(path.join(assetsDir, "s1-hero-opt.webp"), opt);
    } else {
      console.log("  ℹ S1: FLUX failed, using CJ fallback");
    }

    // S2 Macro: 1:1 square
    const macroSeed = Number(catalogId) * 100 + 2;
    const macroResult = await generateFluxImage(plan[1].prompt, 1024, 1024, macroSeed, "S2 Macro");
    if (macroResult) {
      macroBuf = macroResult.buffer;
      const opt = await sharpOptimize(macroBuf, 720, 720, 78, "macro optimized");
      writeFileSync(path.join(assetsDir, "s2-detail-opt.webp"), opt);
    } else {
      console.log("  ℹ S2: FLUX failed, using CJ fallback");
    }

    // S3 Trust: 4:5 portrait
    const desireSeed = Number(catalogId) * 100 + 3;
    const desireResult = await generateFluxImage(plan[2].prompt + " full-body portrait, studio lighting, fashion lifestyle, landscape", 1344, 768, desireSeed, "S3 Trust");
    if (desireResult) {
      desireBuf = desireResult.buffer;
      const opt = await sharpOptimize(desireBuf, 1200, 960, 78, "trust optimized");
      writeFileSync(path.join(assetsDir, "s3-desire-opt.webp"), opt);
    } else {
      console.log("  ℹ S3: FLUX failed, using CJ fallback");
    }
  }

  // === 개별 FLUX 실패 폴백: CJ sharp ===
  // FLUX가 생성하지 못한 각 이미지는 CJ 원본에서 sharp 최적화
  // --no-image 모드: 이미지를 새로 만들지 않고 기존 assets 사용 (HTML/텍스트만 재생성)
  const usesExistingAssets = noImage;
  if (!usesExistingAssets) {
    const needsCjDownload = !heroBuf || !macroBuf || !desireBuf;
    if (needsCjDownload) {
      const sourceBuf = await downloadBuf(row.primaryThumbUrl);
      writeFileSync(path.join(assetsDir, "source-thumb.jpg"), sourceBuf);

      if (!heroBuf) {
        heroBuf = await sharpOptimize(sourceBuf, 960, 1200, 78, "hero CJ fallback (S1)");
        writeFileSync(path.join(assetsDir, "s1-hero-opt.webp"), heroBuf);
      }
      if (!macroBuf) {
        macroBuf = await sharpOptimize(sourceBuf, 720, 720, 78, "macro CJ fallback (S2)");
        writeFileSync(path.join(assetsDir, "s2-detail-opt.webp"), macroBuf);
      }
      if (!desireBuf) {
        desireBuf = await sharpOptimize(sourceBuf, 960, 1200, 78, "desire CJ fallback (S3)");
        writeFileSync(path.join(assetsDir, "s3-desire-opt.webp"), desireBuf);
      }
    }

    // OG (기존에 있으면 재사용하지 않고 재생성 — 히어로 기반이므로 이미지 생성 시에만)
    await generateOgImage(heroBuf!, row.title, path.join(outDir, "og-opt.webp"));
  }

  // ============================================================
  // STEP 2: 텍스트 생성
  // ============================================================
  console.log("\n--- Text Generation ---");
  let doc: PdpStructured = {
    title: row.title,
    subtitle: "",
    descriptionHtml: "",
    usps: ["고급 소재와 정교한 마감", "편안한 핏과 세련된 실루엣", "LEXI 검증 소싱"],
    faq: [
      { q: "사이즈는 어떻게 고르나요?", a: "평소 사이즈를 기준으로 선택하세요." },
      { q: "세탁·관리는?", a: "찬물 세탁, 건조기 사용 자제를 권장합니다." },
      { q: "배송·반품은?", a: "결제 확인 후 출고. 미사용 시 반품 가능합니다." },
    ],
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", row.title, "패션", chip],
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
        rulesetId: "SAMPLE3-FASHION",
        description: "패션 SAMPLE3 카피",
        tonePrefix: "quiet editorial romance",
        noFakeClaims: true,
      }),
    });
    doc = result.doc;
    console.log(`  ✓ text engine: ${result.engine}${result.model ? " (" + result.model + ")" : ""}`);
  } catch (e) {
    console.log("  ℹ template fallback");
  }

  // ============================================================
  // STEP 3: SAMPLE3 HTML 조립
  // ============================================================
  console.log("\n--- HTML Assembly ---");
  const titleMarketing = toKoreanTitle(row.title, chip);
  const titleShort = titleMarketing;
  const html = renderSample3Html({
    title: titleShort,
    titleSub: `${chip} — LEXI가 엄선한 프리미엄`,
    eyebrow: `LEXI CURATED · ${chip.toUpperCase()}`,
    lead: `딱딱한 데일리만 반복되던 옷장에, LEXI가 고른 ${titleMarketing} 하나를 더합니다. 새로운 시즌, 가볍게 입는 방법.`,
    price: `USD ${sell.toFixed(1)}`,
    meta: chip.includes("여성") ? "여성" : `${chip.replace(/['"]/g, "·")} · 여성`,
    chip,
    doc,
    assetPrefix: "./assets",
    heroUrl: "s1-hero-opt.webp",
    macroUrl: "s2-detail-opt.webp",
    desireUrl: "s3-desire-opt.webp",
    ogUrl: "./og-opt.webp",
    modelCast: modelProfile,
    internalName: row.title,
  });

  writeFileSync(path.join(outDir, "index.html"), html, "utf8");

  // ============================================================
  // STEP 4: meta.json (modelCast 포함)
  // ============================================================
  const meta = {
    mockId: `mock-${slug}`,
    styleId: "SAMPLE3",
    status: "draft-mock",
    ruleset: {
      faceLock: "S1→S2→S3 same model face",
      onImageText: "en",
      bodyCopy: "locale ko",
      titleInternal: "CJ original in DETAILS table only",
      titleMarketing: "short regenerated external name",
    },
    catalog: {
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
      castFolder: (ambaCast as any)?.folder ?? "",
    },
    assets: {
      hero: "./assets/s1-hero-opt.webp",
      macro: "./assets/s2-detail-opt.webp",
      desire: "./assets/s3-desire-opt.webp",
      og: "./og-opt.webp",
    },
    previewPath: `/sample3/mock-${slug}/`,
  };

  writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  console.log(`\n=== DONE ===`);
  console.log(`Model: ${modelProfile.name}`);
  console.log(`Product: ${row.title} → USD ${sell.toFixed(1)}`);
  console.log(`Mock: /sample3/mock-${slug}/`);
  console.log(`HTML: ${path.join(outDir, "index.html")}`);
}

const catalogIdArg = process.argv.find((a) => a.startsWith("--catalogId="));
const catalogId = parseInt(catalogIdArg?.split("=")[1] ?? "20", 10);

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});