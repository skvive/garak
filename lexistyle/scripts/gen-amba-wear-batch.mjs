#!/usr/bin/env node
/**
 * AMBA 착용샷 배치 — SAMPLE3 여성패션 PDP (catalog IDs)
 *
 * S1 Hero  = img2img(AMBA 캐스트 화보, denoise .72) → 모델이 상품을 입은 전신 편집샷
 * S2 Macro = img2img(CJ 상품 이미지, denoise .68)    → 원단·디테일 매크로
 * S3 Desire= img2img(S1 결과, denoise .58)            → 같은 얼굴·착장 라이프스타일
 * OG       = S1 기반 1200×630
 * 저장     = assets webp(800x1000/640x640, quality 70) + index.html + meta.json
 * ComfyUI 로컬 FLUX.1 schnell — 크레딧 무차감
 */
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";

const COMFY = "http://127.0.0.1:8188";
const CKPT = "FLUX.1-schnell-dev-merged-fp8.safetensors";
const VAE = "flux1-ae.safetensors";
const CLIP1 = "t5xxl_fp8_e4m3fn.safetensors";
const CLIP2 = "clip_l.safetensors";
const AMB_ROOT = "E:/cursor_HS/kcci/SITE/ambassador-ai-site";
const AMB_WEB = path.join(AMB_ROOT, "lookbook-1000", "web");
const DATA = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const SAMPLE3_BASE = "e:/cursor_HS/lexistyle/public/sample3";
const TMP = path.join(os.homedir(), ".lexi-local", "pdp", "wear-batch");
fs.mkdirSync(TMP, { recursive: true });

// 후보 상품 (여성패션 · mock 미존재 · CJ thumb 보유)
// CAND_IDS=42,95 로 부분 실행 가능
const CANDIDATES = process.env.CAND_IDS
  ? process.env.CAND_IDS.split(",").map((s) => parseInt(s, 10)).filter(Boolean)
  : [36, 42, 43, 48, 52, 71, 92, 95];

const NO_TEXT = "no text, no logos, no watermarks, no readable typography";
// LOW_MEM=1 : 저해상도/저스텝으로 VRAM 부담 완화 (무거운 입력 대응)
const LOW_MEM = process.env.LOW_MEM === "1";
const STEPS = LOW_MEM ? 5 : 6;
const PERSON_W = LOW_MEM ? 768 : 960;
const PERSON_H = LOW_MEM ? 1152 : 1440;
const MACRO_W = LOW_MEM ? 768 : 1024;

// === 카탈로그/캐스트 ===
function getStore() {
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}
function getRow(id) {
  return (getStore().catalog || []).find((c) => Number(c.id) === id);
}
function getCasts() {
  const idx = JSON.parse(fs.readFileSync("e:/cursor_HS/lexistyle/public/casts/amba/index.json", "utf8"));
  return (idx.casts || []).filter((c) => c.source?.sex === "F");
}
function castWebFile(c) {
  const f = c.source?.file;
  if (!f) return null;
  const p = path.join(AMB_WEB, f);
  return fs.existsSync(p) ? p : null;
}

// === ComfyUI 헬퍼 ===
async function downloadBuf(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
async function uploadBuf(buf, name) {
  const form = new FormData();
  form.append("image", new Blob([buf]), name);
  form.append("type", "input");
  form.append("overwrite", "true");
  const res = await fetch(`${COMFY}/upload/image`, { method: "POST", body: form });
  const j = await res.json();
  if (!res.ok) throw new Error(`upload ${name}: ${res.status}`);
  return j.name;
}
async function runPrompt(wf) {
  const res = await fetch(`${COMFY}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`prompt: ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j.prompt_id;
}
async function waitBuf(promptId, label, maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 2000));
    const h = await fetch(`${COMFY}/history/${promptId}`).then((r) => r.json());
    const item = h[promptId];
    if (!item) continue;
    const err = (item.status?.messages || []).map((m) => (m[0] === "execution_error" ? m[1] : null)).filter(Boolean)[0];
    if (err) throw new Error(`${label}: ${(err?.exception_message || "").slice(0, 200)}`);
    for (const nodeId of Object.keys(item.outputs || {})) {
      const img = item.outputs[nodeId]?.images?.[0];
      if (img) {
        const url = `${COMFY}/view?filename=${img.filename}&subfolder=${img.subfolder || ""}&type=${img.type || "output"}`;
        return Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
      }
    }
  }
  throw new Error(`${label} timeout`);
}

// === FLUX img2img 워크플로우 ===
function img2imgWf(inputName, prompt, seed, denoise) {
  const clipL = prompt.slice(0, 256);
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CKPT } },
    "2": { class_type: "DualCLIPLoader", inputs: { clip_name1: CLIP1, clip_name2: CLIP2, type: "flux" } },
    "3": { class_type: "VAELoader", inputs: { vae_name: VAE } },
    "20": { class_type: "LoadImage", inputs: { image: inputName } },
    "23": { class_type: "VAEEncode", inputs: { pixels: ["20", 0], vae: ["3", 0] } },
    "21": { class_type: "CLIPTextEncodeFlux", inputs: { clip: ["2", 0], clip_l: clipL.replace(/"/g, "'"), t5xxl: prompt.replace(/"/g, "'"), guidance: 3.5 } },
    "21n": { class_type: "CLIPTextEncodeFlux", inputs: { clip: ["2", 0], clip_l: "", t5xxl: "", guidance: 3.5 } },
    "22": { class_type: "KSampler", inputs: { seed, steps: STEPS, cfg: 1, sampler_name: "euler", scheduler: "normal", denoise, model: ["1", 0], positive: ["21", 0], negative: ["21n", 0], latent_image: ["23", 0] } },
    "7": { class_type: "VAEDecode", inputs: { samples: ["22", 0], vae: ["3", 0] } },
    "8": { class_type: "SaveImage", inputs: { filename_prefix: "lexi-wear-", images: ["7", 0] } },
  };
}
async function gen(inputName, prompt, seed, denoise, label) {
  const pid = await runPrompt(img2imgWf(inputName, prompt, seed, denoise));
  const buf = await waitBuf(pid, label);
  console.log(`    ✓ ${label}: ${Math.round(buf.length / 1024)}KB src`);
  return buf;
}

// === WebP 최적화 (용량 축소) ===
async function opt(buf, w, h, q, label) {
  let out = null;
  let quality = q;
  for (let i = 0; i < 4; i++) {
    out = await sharp(buf)
      .rotate()
      .resize(w, h, { fit: "cover", position: "centre", withoutEnlargement: false })
      .webp({ quality, alphaQuality: 80, effort: 6 })
      .toBuffer();
    if (out.length <= 35_000 || quality <= 60) break;
    quality -= 5;
  }
  console.log(`    ✓ ${label}: ${w}x${h} ${Math.round(out.length / 1024)}KB WebP`);
  return out;
}

// === 한국어 카테고리/제목 ===
const KO_CATEGORY = [
  { re: /dress/i, ko: "원피스" }, { re: /skirt/i, ko: "스커트" },
  { re: /blouse|top/i, ko: "블라우스 · 탑" }, { re: /sweater|knit|cardigan/i, ko: "니트 · 스웨터" },
  { re: /pants|trousers|jeans|denim/i, ko: "팬츠 · 데님" }, { re: /coat|jacket|outer|blazer|trench/i, ko: "코트 · 자켓" },
  { re: /shirt/i, ko: "셔츠" }, { re: /swim|bikini/i, ko: "수영복" },
];
function koCategoryLabel(chipRaw) {
  for (const c of KO_CATEGORY) if (c.re.test(chipRaw)) return c.ko;
  return "패션";
}

const KO_TITLE_PATTERNS = [
  { re: /chiffon/i, ko: "시폰" }, { re: /floral|flower/i, ko: "플라워" },
  { re: /midi dress/i, ko: "*미디*원피스" }, { re: /long[ -]?sleeved/i, ko: "롱슬리브" },
  { re: /mini dress/i, ko: "*미니*원피스" }, { re: /wrap dress|wrap front/i, ko: "*랩*원피스" },
  { re: /sequined|sequin/i, ko: "시퀀" }, { re: /halter/i, ko: "홀터넥" },
  { re: /backless/i, ko: "백리스" }, { re: /lace[ -]?panel/i, ko: "레이스 패널" },
  { re: /slim[ -]?fit|figure/i, ko: "슬림핏" }, { re: /sheath/i, ko: "시스" },
  { re: /skirt/i, ko: "스커트" }, { re: /dress/i, ko: "원피스" },
  { re: /v[ -]?neck/i, ko: "브이넥" }, { re: /ruffled|ruffle/i, ko: "러플" },
  { re: /peacock/i, ko: "피콕 그린" }, { re: /belted|waist/i, ko: "벨트 포인트" },
  { re: /maxi/i, ko: "맥시" }, { re: /blouse|top|shirt/i, ko: "블라우스" },
  { re: /short[ -]?sleeved|a[ -]?line/i, ko: "에이라인" }, { re: /solid color|solid|casual/i, ko: "데일리" },
  { re: /fashion/i, ko: "패션" },
];
const KO_CATEGORY_GROUP = ["원피스", "스커트", "블라우스", "코트", "자켓"];
function toKoreanTitle(title, chip) {
  const tokens = [];
  for (const p of KO_TITLE_PATTERNS) if (p.re.test(title)) tokens.push(p.ko);
  const head = [];
  let tail = "";
  for (const raw of tokens) {
    if (raw.startsWith("*")) {
      const parts = raw.split("*").filter(Boolean);
      if (parts.length >= 2) { if (!head.includes(parts[0])) head.push(parts[0]); if (!tail) tail = parts[1]; continue; }
    }
    if (KO_CATEGORY_GROUP.includes(raw)) { if (!tail) tail = raw; continue; }
    if (!head.includes(raw)) head.push(raw);
  }
  const joined = [...head.slice(0, 3), tail].filter(Boolean).join(" ");
  return joined || (koCategoryLabel(chip) + " 아이템");
}
function pickCastFor(casts, rowId, chipRaw) {
  const pool = casts.filter((c) => c.source?.sex === "F" && castWebFile(c));
  if (!pool.length) throw new Error("no female cast with web file");
  let pref = ["STU", "HIG", "STR"];
  if (/blouse|top|shirt/i.test(chipRaw)) pref = ["STU", "FML", "HIG"];
  if (/skirt|dress/i.test(chipRaw)) pref = ["STU", "HIG", "FML"];
  if (/coat|jacket|knit|hoodie|sweater/i.test(chipRaw)) pref = ["STR", "OUT", "STU"];
  const ranked = pool
    .map((c, i) => ({ c, i, styleIdx: pref.indexOf(c.source?.style || "") }))
    .sort((a, b) => (a.styleIdx === -1 ? 999 : a.styleIdx) - (b.styleIdx === -1 ? 999 : b.styleIdx) || a.i - b.i);
  const idx = Number(rowId) % Math.max(1, ranked.length);
  return ranked[idx].c;
}

// === SAMPLE3 HTML — 기존 mock style 재사용 + body 생성 ===
const BASE_MOCK_HTML = "e:/cursor_HS/lexistyle/public/sample3/mock-women-s-dress-61634800/index.html";
function readSample3Style() {
  const h = fs.readFileSync(BASE_MOCK_HTML, "utf8");
  const m = h.match(/<style>[\s\S]*?<\/style>/);
  return m ? m[0] : "";
}
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderBody({ hi, mi, di, oi, title, titleSub, eyebrow, lead, price, meta, chip, usps, faqs, internal, modelCast, interestStr }) {
  const u = [usps[0] || "프리미엄 패션", usps[1] || "편안한 핏", usps[2] || "LEXI 큐레이션"];
  const fq = faqs.slice(0, 3);
  while (fq.length < 3) fq.push({ q: "사이즈는 어떻게 고르나요?", a: "평소 사이즈를 기준으로 선택하세요." });
  return `<header class="top"><div class="logo">LEXI<span>.</span></div><div class="nav"><span>Women's Fashion</span><span class="chip">${chip} · SAMPLE3</span></div></header>
<article class="wrap">
  <div class="brand-strip"><div><strong>LEXI</strong> · LEXI Curated</div><div>Curated by LEXI · ${title}</div></div>
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
      <li class="usp"><strong>${u[0]}</strong><span>${title} — LEXI가 엄선한 큐레이션 아이템.</span></li>
      <li class="usp"><strong>${u[1]}</strong><span>데일리부터 특별한 날까지 자연스럽게.</span></li>
      <li class="usp"><strong>${u[2]}</strong><span>투명한 가격과 검증된 품질.</span></li>
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
      <tr><th>Internal name</th><td>${internal}</td></tr>
      <tr><th>Fit</th><td>${meta}</td></tr>
      <tr><th>Category</th><td>${chip}</td></tr>
      <tr><th>Season</th><td>올시즌 데일리</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</div>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${fq.map((x) => `<details class="faq"><summary>${x.q}</summary><p>${x.a}</p></details>`).join("\n    ")}
  </section>
  <section class="cta-band">
    <a class="cta" href="#cart">LEXI 장바구니 담기</a>
    <p class="cta-sub">LEXI Curated · Free shipping info at checkout</p>
  </section>
</article>`;
}

function renderSample3Html({ title, titleSub, eyebrow, lead, price, meta, chip, usps, faqs, internalName, modelCast, heroUrl, macroUrl, desireUrl, ogUrl }) {
  const hi = `./assets/${heroUrl}`, mi = `./assets/${macroUrl}`, di = `./assets/${desireUrl}`, oi = ogUrl;
  const interestStr = (modelCast.interests || []).join(" · ");
  const internal = internalName.length > 60 ? internalName.slice(0, 58) + "…" : internalName;
  const body = renderBody({ hi, mi, di, oi, title, titleSub, eyebrow, lead, price, meta, chip, usps, faqs, internal, modelCast, interestStr });
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escHtml(title)} · LEXI</title>
<meta name="description" content="${escHtml(titleSub)} · LEXI Curated"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${escHtml(title)}"/><meta property="og:description" content="${escHtml(titleSub)} · LEXI Curated"/>
<meta property="og:image" content="${oi}"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${oi}"/>
${readSample3Style()}
</head>
<body>
${body}
<p class="foot">© LEXI · ${chip} · SAMPLE3</p>
</body></html>`;
}

// === 메인 루프 ===
async function processOne(casts, id) {
  const row = getRow(id);
  if (!row || !row.primaryThumbUrl) { console.log(`#${id} SKIP (no row/thumb)`); return; }
  const cost = parseFloat(row.minPrice || "0") || 0;
  const sell = Math.ceil((cost + 20) * 1.3) - 0.1;
  const extId = String(row.externalId);
  const chipRaw = row.categoryPath?.[0] || "Fashion";
  const chip = koCategoryLabel(chipRaw);
  const title = escHtml(toKoreanTitle(row.title, chipRaw));
  const slugBase = row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  const outDir = path.join(SAMPLE3_BASE, `mock-${slugBase}-${extId.slice(-8)}`);
  const assetsDir = path.join(outDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const cast = pickCastFor(casts, id, chipRaw);
  const modelCast = {
    id: cast.id, name: cast.name, gender: "여성", nationality: cast.nationality,
    interests: cast.interests || [], agency: "AMBA", agencyFull: "AI Ambassador",
    faceSeed: cast.publicPath, castFolder: cast.folder,
  };
  const personWeb = castWebFile(cast);
  console.log(`\n### [#${id}] ${row.title.slice(0, 40)}`);
  console.log(`    chip=${chip} · title=${title} · sell=$${sell.toFixed(1)}`);
  console.log(`    cast=${modelCast.name} (${cast.id} · ${cast.source?.style})`);

  // S1 Hero — 캐스트 화보 기반 착용샷
  const personBuf = await sharp(fs.readFileSync(personWeb)).resize(PERSON_W, PERSON_H, { fit: "inside", withoutEnlargement: false }).toBuffer();
  const personName = await uploadBuf(personBuf, `p${id}-person.png`);
  const heroPrompt =
    `young female fashion model, full body editorial studio shot, wearing the exact ${title} fashion item from the product photo, ` +
    `keep the woman's face and pose, swap her outfit to this garment, ` +
    `cream paper studio background (#faf9f7), soft diffused light, high-end K-fashion lookbook, photorealistic, ` + NO_TEXT;
  const heroRaw = await gen(personName, heroPrompt, id * 1000 + 1, 0.72, "S1 Hero");
  const heroOpt = await opt(heroRaw, 800, 1000, 70, "s1-hero");
  fs.writeFileSync(path.join(assetsDir, "s1-hero-opt.webp"), heroOpt);

  // S2 Macro — CJ 상품 이미지 기반 디테일
  const cjBuf = await downloadBuf(row.primaryThumbUrl);
  const macroInput = await sharp(cjBuf).resize(MACRO_W, MACRO_W, { fit: "cover", withoutEnlargement: false }).toBuffer();
  const macroName = await uploadBuf(macroInput, `p${id}-garment.png`);
  const macroPrompt =
    `extreme close-up macro of the ${title} fabric weave and seam detail, ` +
    `soft natural light, shallow depth of field, K-fashion textile editorial, ` + NO_TEXT;
  const macroRaw = await gen(macroName, macroPrompt, id * 1000 + 2, 0.68, "S2 Macro");
  const macroOpt = await opt(macroRaw, 640, 640, 70, "s2-macro");
  fs.writeFileSync(path.join(assetsDir, "s2-detail-opt.webp"), macroOpt);

  // S3 Desire — S1 결과 기준 같은 모델·착장
  const heroName2 = await uploadBuf(heroRaw, `p${id}-hero-result.png`);
  const trustPrompt =
    `the same female fashion model wearing the same ${title} outfit, ` +
    `now in a warm minimal everyday setting, candid lifestyle, soft natural light, ` +
    `keep the same face and the same outfit, editorial commerce photography, ` + NO_TEXT;
  const trustRaw = await gen(heroName2, trustPrompt, id * 1000 + 3, 0.58, "S3 Desire");
  const trustOpt = await opt(trustRaw, 800, 1000, 68, "s3-desire");
  fs.writeFileSync(path.join(assetsDir, "s3-desire-opt.webp"), trustOpt);

  // OG
  const ogBuf = await sharp(heroRaw).resize(1200, 630, { fit: "cover", position: "centre" }).webp({ quality: 78 }).toBuffer();
  fs.writeFileSync(path.join(outDir, "og-opt.webp"), ogBuf);

  // HTML + meta
  const html = renderSample3Html({
    title, titleSub: `${chip} — LEXI가 엄선한 프리미엄`, eyebrow: `LEXI CURATED · ${chipRaw.toUpperCase()}`,
    lead: `딱딱한 데일리만 반복되던 옷장에, LEXI가 고른 ${title} 하나를 더합니다. 새로운 시즌, 가볍게 입는 방법.`,
    price: `USD ${sell.toFixed(1)}`, meta: `${chip} · 여성`, chip,
    usps: ["Curated ladies fashion pick", "Duty-calculated checkout", "In-stock sourcing with tracked dispatch"],
    faqs: [
      { q: "반품이나 교환은 어떻게 하나요?", a: "수령 후 7일 이내 미착용 상태로 연락 주시면 도와드립니다. 단순 변심은 왕복 배송비 고객 부담입니다." },
      { q: "세탁 시 주의할 점이 있나요?", a: "섬세한 소재 보호를 위해 찬물 손세탁과 그늘 건조를 권장합니다." },
      { q: "사이즈는 어떻게 고르나요?", a: "평소 사이즈를 기준으로 선택하세요. 사이즈 문의는 LEXI 상담으로 도와드립니다." },
    ],
    internalName: row.title,
    modelCast, heroUrl: "s1-hero-opt.webp", macroUrl: "s2-detail-opt.webp", desireUrl: "s3-desire-opt.webp", ogUrl: "./og-opt.webp",
  });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");

  const meta = {
    mockId: `mock-${slugBase}-${extId.slice(-8)}`, styleId: "SAMPLE3", status: "draft-mock",
    ruleset: { faceLock: "S1→S2→S3 same model face", onImageText: "en", bodyCopy: "locale ko", titleInternal: "CJ original in DETAILS only", titleMarketing: "short regenerated" },
    catalog: { externalId: extId, titleInternal: row.title, titleMarketing: { ko: title, en: row.title }, categoryPath: row.categoryPath ?? [chipRaw], costUsd: cost, sellUsd: sell, sourceThumb: "./assets/source-thumb.jpg" },
    modelCast: { id: cast.id, name: modelCast.name, gender: "여성", nationality: modelCast.nationality, interests: modelCast.interests, agency: "AMBA", agencyFull: "AI Ambassador", faceSeed: cast.publicPath, castFolder: cast.folder },
    assets: { hero: "./assets/s1-hero-opt.webp", macro: "./assets/s2-detail-opt.webp", desire: "./assets/s3-desire-opt.webp", og: "./og-opt.webp" },
    previewPath: `/sample3/mock-${slugBase}-${extId.slice(-8)}/`,
  };
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  console.log(`    ✓ saved: mock-${slugBase}-${extId.slice(-8)}/ (${Math.round(heroOpt.length / 1024)}+${Math.round(macroOpt.length / 1024)}+${Math.round(trustOpt.length / 1024)}KB)`);
}

const startTime = Date.now();
const casts = getCasts();
const limitArgIdx = process.argv.findIndex((a) => a.startsWith("--limit="));
const limit = limitArgIdx >= 0 ? parseInt(process.argv[limitArgIdx].split("=")[1], 10) : CANDIDATES.length;
const targets = CANDIDATES.slice(0, limit);
console.log(`\n===== AMBA 착용샷 배치: ${targets.length}개 · 여성 F 캐스트 ${casts.length}명 =====`);
for (let i = 0; i < targets.length; i++) {
  const t0 = Date.now();
  await processOne(casts, targets[i]);
  const dt = (Date.now() - t0) / 60000;
  const remain = ((targets.length - i - 1) * dt).toFixed(1);
  console.log(`    >> [${i + 1}/${targets.length}] ${dt.toFixed(1)}분 · 남은 예상 ${remain}분`);
}
console.log(`\n===== 완료: ${targets.length}개 · 총 ${((Date.now() - startTime) / 60000).toFixed(1)}분 =====`);