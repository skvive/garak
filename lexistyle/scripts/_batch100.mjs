// 100개 여성패션 소싱상품 SAMPLE3 상세페이지 배치 생성
// 단계: CJ API 원본 이미지 검증/동기화 -> AMBA 캐스트 배정 -> bl image edit Hero 생성
//       -> 헤드룸 검증(재시도) -> sharp 크롭(S1/S2/S3/OG) -> 한글 카피 생성 -> HTML 조립
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import sharp from "sharp";

const TARGETS = JSON.parse(readFileSync("scripts/_target100.json", "utf-8"));

const FACE_BASE = "https://lexistyle.vercel.app/casts/amba";
// 캐스트 풀 (36종 인덱스 중 여성 캐스트 순환 배정 — public/casts/amba/index.json 참조)
const castsIndex = JSON.parse(readFileSync("public/casts/amba/index.json", "utf-8"));
const femaleCasts = castsIndex.casts.filter((c) => c.source?.sex === "F");
console.log(`female casts available: ${femaleCasts.length}`);

const ITEM_KO = [
  // 주얼리/액세서리를 먼저 매칭(뒤쪽 일반 키워드보다 우선순위 높게)
  [/necklace/i, "목걸이"], [/choker/i, "초커"], [/bracelet/i, "팔찌"], [/\bring\b/i, "반지"],
  [/earring/i, "귀걸이"], [/pendant/i, "펜던트"], [/watch\s*band|watch\s*strap/i, "시계밴드"],
  [/backpack/i, "백팩"], [/\bbag\b/i, "가방"], [/tote/i, "토트백"], [/shoulder bag/i, "숄더백"],
  [/dress/i, "원피스"], [/skirt/i, "스커트"], [/jumpsuit/i, "점프수트"],
  [/blouse/i, "블라우스"], [/t-?shirt/i, "티셔츠"], [/shirt/i, "셔츠"], [/\btop\b/i, "상의"],
  [/sweatshirt/i, "스웨트셔츠"], [/sweater|knit/i, "니트"],
  [/cardigan/i, "가디건"], [/jacket/i, "재킷"], [/coat/i, "코트"], [/hoodie/i, "후드티"],
  [/pants|trousers/i, "팬츠"], [/jeans|denim/i, "데님팬츠"], [/shorts/i, "쇼츠"],
  [/suit|two-piece|set\b/i, "세트"], [/vest/i, "베스트"], [/scarf|shawl/i, "숄"],
  [/sandal/i, "샌들"], [/sneaker|flat shoes/i, "스니커즈"], [/heel/i, "힐"], [/\bhat\b|bowler/i, "모자"],
  [/clutch/i, "클러치백"], [/cover[- ]?up/i, "커버업"], [/\bbelt\b/i, "벨트"],
];
const COLOR_KO = [
  [/white/i, "화이트"], [/black/i, "블랙"], [/\bred\b/i, "레드"], [/pink/i, "핑크"],
  [/\bblue\b/i, "블루"], [/navy/i, "네이비"], [/green/i, "그린"], [/yellow/i, "옐로우"],
  [/beige/i, "베이지"], [/brown/i, "브라운"], [/gr[ae]y/i, "그레이"], [/cream/i, "크림"],
  [/purple/i, "퍼플"], [/orange/i, "오렌지"], [/khaki/i, "카키"], [/floral/i, "플로럴"],
  [/stripe/i, "스트라이프"], [/plaid|check/i, "체크"], [/polka dot/i, "도트"],
];

function pick(name, dict, fallback) {
  for (const [re, ko] of dict) if (re.test(name)) return ko;
  return fallback;
}
function styleForCategory(cat) {
  if (/dress|skirt|top|blouse|shirt/.test(cat)) return ["STU", "HIG", "FML"];
  if (/knit|sweater|cardigan|outer|coat/.test(cat)) return ["STR", "OUT", "STU"];
  if (/pants|denim/.test(cat)) return ["STR", "STU"];
  return ["STU", "HIG", "STR"];
}

function sh(cmd) {
  // Windows execSync 기본 셸(cmd.exe)은 node_modules/.bin/tsx 같은 POSIX 상대경로를
  // 못 찾아 매 호출이 실패했음(FAIL: 'node_modules'는 내부 또는 외부 명령... 아님).
  // Git Bash를 명시해 해결.
  return execSync(cmd, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024, shell: "C:\\Program Files\\Git\\bin\\bash.exe" });
}

function verifyHeadroom(file) {
  try {
    sh(`node scripts/verify-hero-headroom.mjs "${file}"`);
    return true;
  } catch {
    return false;
  }
}

async function buildAssets(slug, srcPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  const meta = await sharp(srcPath).metadata();
  const W = meta.width, H = meta.height;
  async function opt(buf, w, h, q) {
    return sharp(buf).rotate().resize(w, h, { fit: "cover" }).webp({ quality: q, effort: 5 }).toBuffer();
  }
  const heroBuf = await sharp(srcPath).toBuffer();
  const s1 = await opt(heroBuf, 960, 1200, 76);
  writeFileSync(`${outDir}/s1-hero-opt.webp`, s1);

  const s2crop = await sharp(srcPath)
    .extract({ left: Math.round(W * 0.28), top: Math.round(H * 0.5), width: Math.round(W * 0.44), height: Math.round(W * 0.44) })
    .toBuffer();
  writeFileSync(`${outDir}/s2-detail-opt.webp`, await opt(s2crop, 720, 720, 76));

  // 헤드룸 프롬프트로 얼굴이 대략 상단 20~25% 지점부터 시작 — top을 충분히
  // 낮춰(0.02) 머리 잘림 방지(사용자 지적: 기존 top 0.09/0.25도 일부 잘렸음)
  const s3crop = await sharp(srcPath)
    .extract({ left: Math.round(W * 0.12), top: Math.round(H * 0.02), width: Math.round(W * 0.76), height: Math.round(W * 0.76 * 1.25) })
    .toBuffer();
  writeFileSync(`${outDir}/s3-desire-opt.webp`, await opt(s3crop, 960, 1200, 74));

  const ogcrop = await sharp(srcPath)
    .extract({ left: 0, top: Math.round(H * 0.06), width: W, height: Math.round(W * 630 / 1200) })
    .toBuffer();
  writeFileSync(`${outDir}/og-opt.webp`, await opt(ogcrop, 1200, 630, 78));
}

function buildHtmlAndStructured(p, cast, ko) {
  const structured = {
    title: ko.title,
    subtitle: ko.subtitle,
    descriptionHtml: `<p>${ko.desc1}</p><p>${ko.desc2}</p>`,
    usps: ko.usps,
    faq: ko.faq,
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", ko.title, ko.itemKo],
    galleryAssetIndexes: [0, 1, 2],
  };
  const A = `/pdp/${p.slug}`;
  const html = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${A}/s1-hero-opt.webp" alt="${ko.title} 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED</p><h1 style="margin:0;font-size:32px;line-height:1.25">${ko.title}</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">${ko.subtitle}</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${A}/s2-detail-opt.webp" alt="${ko.title} 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${A}/s3-desire-opt.webp" alt="${ko.title} 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">${cast.name}</strong> · 여성 · ${cast.nationality}<br/>${cast.interests.join(" · ")}<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${structured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">${ko.desc1}</p><p style="margin:0">${ko.desc2}</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">${ko.styling}</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">${ko.title}</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">${p.name}</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">${ko.colorKo}</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">사계절 데일리</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${structured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;
  return { html, structured, assetUrls: [`${A}/s1-hero-opt.webp`, `${A}/s2-detail-opt.webp`, `${A}/s3-desire-opt.webp`] };
}

function koCopy(p, itemKo, colorKo) {
  const title = `${colorKo} ${itemKo}`.trim();
  const subtitle = `데일리에 포인트를 더하는 ${colorKo} ${itemKo}.`;
  return {
    title, subtitle, itemKo, colorKo,
    desc1: `${colorKo} 톤의 ${itemKo}로 은은한 존재감을 더했습니다. 가볍게 매치하는 것만으로 룩의 완성도가 달라집니다.`,
    desc2: `데일리부터 특별한 자리까지, 부담 없이 활용하기 좋은 아이템입니다.`,
    usps: [`${colorKo} 톤의 은은한 포인트`, `데일리로 활용하기 좋은 실용적 디자인`, `가볍게 매치하는 것만으로 완성되는 스타일링`],
    styling: `베이직 아이템과 매치해 자연스러운 데일리룩을 완성해 보세요.`,
    faq: [
      { q: "사이즈 선택 팁이 있나요?", a: "정사이즈 착용을 권장합니다. 상세 사이즈 표를 확인해 주세요." },
      { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
    ],
  };
}

async function processOne(p, cast, idx) {
  const outDir = `public/pdp/${p.slug}`;
  if (existsSync(`${outDir}/s1-hero-opt.webp`)) {
    console.log(`[${idx}] SKIP (exists): ${p.slug}`);
    return null;
  }
  console.log(`[${idx}] START: ${p.slug} (${p.name.slice(0, 50)})`);

  // 1) CJ API로 원본 이미지 검증/확보. DB 이미지가 로컬 상대경로(이전 세션의
  // 다른 상품 PDP 에셋이 잘못 채워진 버그, 예: dove-floral 케이스)면 bl image
  // edit에 그대로 넘겨선 안 되므로 CJ 조회 성공이 필수.
  const pidMatch = p.slug.match(/(\d{15,25})$/);
  const dbImageIsValid = /^https?:\/\//.test(p.image || "");
  let origImage = dbImageIsValid ? p.image : null;
  if (pidMatch) {
    try {
      const out = sh(`node_modules/.bin/tsx scripts/_cj-check-tmp.ts "${pidMatch[1]}" 2>&1`);
      const marker = "===JSON===";
      const jsonStart = out.indexOf(marker);
      if (jsonStart >= 0) {
        const data = JSON.parse(out.slice(jsonStart + marker.length));
        if (data.images?.[0]?.url) {
          origImage = data.images[0].url;
          if (origImage !== p.image) {
            sh(`node_modules/.bin/tsx scripts/_fix-product-image-tmp.ts ${p.id} "${origImage}"`);
            console.log(`  [${idx}] image fixed via CJ API`);
          }
        }
      }
    } catch (e) {
      console.log(`  [${idx}] CJ API check failed: ${String(e).slice(0, 150)}`);
    }
  }
  if (!origImage) {
    console.log(`  [${idx}] SKIP: 원본 이미지 확보 실패(로컬경로 버그+CJ조회 실패) — ${p.slug}`);
    return null;
  }

  const itemKo = pick(p.name, ITEM_KO, "아이템");
  const colorKo = pick(p.name, COLOR_KO, "뉴트럴");
  const ko = koCopy(p, itemKo, colorKo);
  const faceUrl = `${FACE_BASE}/${cast.folder}/face.webp`;

  const MOODS = [
    "warm minimal café interior, soft window light, gentle bokeh",
    "golden-hour tree-lined street, gentle bokeh, soft warm light",
    "minimal boutique interior, soft daylight through sheer curtains",
    "sunlit urban sidewalk, blurred city background, soft afternoon light",
    "cozy home living room with warm ambient light, soft depth of field",
    "neutral gallery wall interior, soft diffused daylight",
  ];
  const mood = MOODS[p.id % MOODS.length];
  const prompt = `CRITICAL FRAMING RULE — apply before anything else: this is a WIDE, ZOOMED-OUT full-body shot. The model's head is SMALL within the frame and sits around the vertical midpoint, never near the top edge. Leave at least 20% of the total image height as empty background above the top of the model's hair — the entire top fifth of the frame must contain background only, absolutely no hair or skin. Photograph as if standing several extra steps back from the subject. Keep the EXACT garment/item from the first reference image: its structure, color, pattern and details. Use the face, hair and identity of the woman in the second reference image. Full-body fashion lookbook photo of one young female model wearing/carrying this exact item, standing 3/4 pose, generous empty space above her head, head, shoes and hem all fully visible, ${mood}, soft natural light, photorealistic, high detail fabric texture, no text, no logos, no watermarks, no other people. Reminder: forehead, complete hair, chin, both feet and hem fully inside frame, with wide margin above the head.`;

  const tmpOut = `tmp/pdp-source/${p.slug}`;
  let heroPath = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const seed = 90000 + p.id * 10 + attempt;
    const prefix = `${p.slug}-v${attempt}`;
    try {
      sh(`bl image edit --image "${origImage}" --image "${faceUrl}" --prompt "${prompt.replace(/"/g, '\\"')}" --model wan2.7-image --size 3:4 --watermark false --seed ${seed} --out-dir "${tmpOut}" --out-prefix "${prefix}"`);
    } catch (e) {
      console.log(`  [${idx}] gen attempt ${attempt} failed: ${String(e).slice(0, 200)}`);
      continue;
    }
    const candidate = `${tmpOut}/${prefix}.png`;
    if (existsSync(candidate) && verifyHeadroom(candidate)) {
      heroPath = candidate;
      break;
    }
    console.log(`  [${idx}] attempt ${attempt} headroom FAIL, retry`);
  }
  if (!heroPath) {
    console.log(`  [${idx}] FAIL all attempts: ${p.slug}`);
    return null;
  }

  await buildAssets(p.slug, heroPath, outDir);
  const result = buildHtmlAndStructured(p, cast, ko);
  console.log(`  [${idx}] DONE: ${p.slug}`);
  return { slug: p.slug, ...result };
}

async function main() {
  const batch = existsSync("src/lib/pdp/sample3-batch-data.json")
    ? JSON.parse(readFileSync("src/lib/pdp/sample3-batch-data.json", "utf-8"))
    : {};
  for (let i = 0; i < TARGETS.length; i++) {
    const p = TARGETS[i];
    const cast = femaleCasts[i % femaleCasts.length];
    try {
      const r = await processOne(p, cast, i + 1);
      if (r) {
        batch[r.slug] = { html: r.html, structured: r.structured, assetUrls: r.assetUrls };
        writeFileSync("src/lib/pdp/sample3-batch-data.json", JSON.stringify(batch, null, 2));
      }
    } catch (e) {
      console.log(`[${i + 1}] ERROR ${p.slug}: ${String(e).slice(0, 300)}`);
    }
  }
  console.log(`\n=== BATCH DONE: ${Object.keys(batch).length} total in batch ===`);
}
main();
