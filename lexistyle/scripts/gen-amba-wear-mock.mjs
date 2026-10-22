#!/usr/bin/env node
/**
 * AMBA Amaya 착용샷 재생성 — SAMPLE3 PDP (catalog #18 블라우스+레이스스커트 세트)
 *
 * S1 Hero  = img2img(Amaya STU 화보, denoise .72) → 아마야가 상품을 입은 전신 편집샷
 * S2 Macro = img2img(CJ 상품 이미지, denoise .68)  → 원단·레이스 매크로
 * S3 Desire= img2img(S1 결과, denoise .58)          → 같은 모델·착장 라이프스타일
 * OG       = S1 기반 1200×630 cover
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

const CATALOG_ID = 18;
const CAST = {
  id: "0434",
  name: "아마야 · Amaya",
  gender: "여성",
  nationality: "대한민국",
  interests: ["스튜디오 라이트", "미니멀 스타일", "필름"],
  agency: "AMBA",
  agencyFull: "AI Ambassador",
  faceSeed: "/casts/amba/0434_EA_KR_F_A1/face.webp",
  castFolder: "0434_EA_KR_F_A1",
};
const AMB_STU = "E:/cursor_HS/kcci/SITE/ambassador-ai-site/lookbook-1000/web/0434_EA_KR_F_A1_STU.webp";

const DATA = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const TMP = path.join(os.homedir(), ".lexi-local", "pdp", "wear-18");
fs.mkdirSync(TMP, { recursive: true });

function getRow() {
  const d = JSON.parse(fs.readFileSync(DATA, "utf8"));
  return (d.catalog || []).find((c) => Number(c.id) === CATALOG_ID);
}

async function downloadBuf(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadBuf(buf, name, type = "input") {
  const form = new FormData();
  form.append("image", new Blob([buf]), name);
  form.append("type", type);
  form.append("overwrite", "true");
  const res = await fetch(`${COMFY}/upload/image`, { method: "POST", body: form });
  const j = await res.json();
  if (!res.ok) throw new Error(`upload ${name}: ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j.name;
}

async function runPrompt(wf) {
  const res = await fetch(`${COMFY}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`prompt: ${res.status} ${JSON.stringify(j).slice(0, 300)}`);
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
    if (err) throw new Error(`${label} execution_error: ${(err?.exception_message || "").slice(0, 200)}`);
    for (const nodeId of Object.keys(item.outputs || {})) {
      const img = item.outputs[nodeId]?.images?.[0];
      if (img) {
        const url = `${COMFY}/view?filename=${img.filename}&subfolder=${img.subfolder || ""}&type=${img.type || "output"}`;
        const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
        return buf;
      }
    }
  }
  throw new Error(`${label} timeout`);
}

/** FLUX img2img — source 이미지를 기반으로 denoise 만큼 재렌더 */
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
    "22": { class_type: "KSampler", inputs: { seed, steps: 6, cfg: 1, sampler_name: "euler", scheduler: "normal", denoise, model: ["1", 0], positive: ["21", 0], negative: ["21n", 0], latent_image: ["23", 0] } },
    "7": { class_type: "VAEDecode", inputs: { samples: ["22", 0], vae: ["3", 0] } },
    "8": { class_type: "SaveImage", inputs: { filename_prefix: "lexi-wear-", images: ["7", 0] } },
  };
}

async function gen(inputName, prompt, seed, denoise, label) {
  const pid = await runPrompt(img2imgWf(inputName, prompt, seed, denoise));
  const buf = await waitBuf(pid, label);
  console.log(`  ✓ ${label}: ${buf.length} bytes`);
  return buf;
}

async function opt(buf, w, h, q, label) {
  const { data, info } = await sharp(buf)
    .rotate()
    .resize(w, h, { fit: "inside", withoutEnlargement: false })
    .webp({ quality: q, alphaQuality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  console.log(`  ✓ ${label}: ${info.width}×${info.height} ${(info.size / 1024).toFixed(1)}KB WebP`);
  return data;
}

// ================= main =================
const row = getRow();
if (!row) throw new Error(`catalog ${CATALOG_ID} not found`);
const cost = parseFloat(row.minPrice || "0") || 0;
const sell = Math.ceil((cost + 20) * 1.3) - 0.1;
const extId = String(row.externalId);
const slugBase = row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
const outDir = path.join("e:/cursor_HS/lexistyle/public/sample3", `mock-${slugBase}-${extId.slice(-8)}`);
const assetsDir = path.join(outDir, "assets");
fs.mkdirSync(assetsDir, { recursive: true });

console.log(`\n=== [${CATALOG_ID}] ${row.title}`);
console.log(`    판매가 $${sell.toFixed(1)} · 모델: ${CAST.name} (${CAST.nationality})`);
console.log(`    Out: ${outDir}\n`);

const NO_TEXT = "no text, no logos, no watermarks, no readable typography";

try {
  // ---- 입력 준비: Amaya STU 기반 hero input + CJ garment ----
  const ambBuf = fs.readFileSync(AMB_STU);
  const heroInput = await sharp(ambBuf).resize(960, 1440, { fit: "inside", withoutEnlargement: false }).toBuffer();
  const heroName = await uploadBuf(heroInput, "amaya-hero-in.png");

  const cjBuf = await downloadBuf(row.primaryThumbUrl);
  fs.writeFileSync(path.join(TMP, "garment.jpg"), cjBuf);
  const macroInput = await sharp(cjBuf).resize(1024, 1024, { fit: "cover", withoutEnlargement: false }).toBuffer();
  const macroName = await uploadBuf(macroInput, "garment-18.png");

  // ---- S1 Hero: 아마야가 상품을 입은 착용샷 ----
  const heroPrompt =
    `young Korean female fashion model, full body editorial studio shot, ` +
    `wearing the exact waist-cinching cream blouse with lace-up front detail ` +
    `and matching short skirt with lace ties, ` +
    `keep the woman's face and pose, swap her outfit to this blouse and skirt, ` +
    `cream paper studio background (#faf9f7), soft diffused window light, ` +
    `high-end K-fashion lookbook, photorealistic, sharp focus, ` + NO_TEXT;
  const heroRaw = await gen(heroName, heroPrompt, CATALOG_ID * 1000 + 1, 0.72, "S1 Hero img2img");
  const heroOpt = await opt(heroRaw, 960, 1200, 78, "s1-hero optimized");
  fs.writeFileSync(path.join(assetsDir, "s1-hero-opt.webp"), heroOpt);

  // ---- S2 Macro: 원단·레이스 매크로 ----
  const macroPrompt =
    `extreme close-up macro of a cream blouse fabric weave and delicate lace trim detail, ` +
    `soft natural light, shallow depth of field, K-fashion textile editorial, ` +
    `artisanal craft feel, photorealistic, ` + NO_TEXT;
  const macroRaw = await gen(macroName, macroPrompt, CATALOG_ID * 1000 + 2, 0.68, "S2 Macro img2img");
  const macroOpt = await opt(macroRaw, 720, 720, 78, "s2-macro optimized");
  fs.writeFileSync(path.join(assetsDir, "s2-detail-opt.webp"), macroOpt);

  // ---- S3 Desire: S1 기준 같은 모델·착장 라이프스타일 ----
  const heroName2 = await uploadBuf(heroRaw, "s1-hero-result.png");
  const trustPrompt =
    `the same Korean female fashion model wearing the cream blouse and lace skirt, ` +
    `now sitting at a warm minimal cafe with coffee, candid street style, soft natural light, ` +
    `keep the same face and the same outfit, editorial commerce photography, ` + NO_TEXT;
  const trustRaw = await gen(heroName2, trustPrompt, CATALOG_ID * 1000 + 3, 0.58, "S3 Desire img2img");
  const trustOpt = await opt(trustRaw, 960, 1200, 75, "s3-desire optimized");
  fs.writeFileSync(path.join(assetsDir, "s3-desire-opt.webp"), trustOpt);

  // ---- OG ----
  const ogBuf = await sharp(heroRaw).resize(1200, 630, { fit: "cover", position: "center" }).webp({ quality: 80 }).toBuffer();
  fs.writeFileSync(path.join(outDir, "og-opt.webp"), ogBuf);
  console.log(`  ✓ OG: ${Math.round(ogBuf.length / 1024)}KB WebP`);

  // ---- meta.json 갱신 ----
  const metaPath = path.join(outDir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  meta.modelCast = {
    id: CAST.id, name: CAST.name, gender: CAST.gender, nationality: CAST.nationality,
    interests: CAST.interests, agency: CAST.agency, agencyFull: CAST.agencyFull,
    faceSeed: CAST.faceSeed, castFolder: CAST.castFolder,
  };
  meta.catalog.sellUsd = sell;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log("  ✓ meta.json modelCast → Amaya");

  // ---- index.html 모델 프로필 갱신 ----
  const htmlPath = path.join(outDir, "index.html");
  let h = fs.readFileSync(htmlPath, "utf8");
  h = h.replace(/<ul class="model-profile">[\s\S]*?<\/ul>/,
    `<ul class="model-profile">` +
    `<li><span class="k">이름</span><span class="v">${CAST.name}</span></li>` +
    `<li><span class="k">성별</span><span class="v">${CAST.gender}</span></li>` +
    `<li><span class="k">국적</span><span class="v">${CAST.nationality}</span></li>` +
    `<li><span class="k">관심사</span><span class="v">${CAST.interests.join(" · ")}</span></li>` +
    `</ul>`);
  h = h.replace(/수아\s*·\s*Su[aua]/g, CAST.name);
  fs.writeFileSync(htmlPath, h, "utf8");
  console.log("  ✓ index.html model profile → Amaya");

  console.log(`\n=== DONE ===`);
  console.log(`Model: ${CAST.name} (${CAST.id})`);
  console.log(`Mock: /sample3/mock-${slugBase}-${extId.slice(-8)}/`);
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
}