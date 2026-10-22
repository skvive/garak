#!/usr/bin/env node
/**
 * gen-amba-openai-pdp.mjs
 *
 * SAMPLE3 + AMBA PDP 생성 — OpenAI DALL-E 3 (gpt-image-1)
 * 각 상품: S1 Hero / S2 Detail / S3 Desire / OG
 * 이미지 생성 → sharp WebP → HTML 조립 → pdp-site/
 *
 * SKILL.md 워크플로우 정식 구현
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { config as loadEnv } from "dotenv";
import { cjConnector } from "../src/lib/sourcing/connectors/cjdropshipping";

// ============================================================
// ENV
// ============================================================
loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

// ============================================================
// AMBA 캐스트
// ============================================================
const INDEX_PATH = path.join(process.cwd(), "public", "casts", "amba", "index.json");
function loadCasts() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")).casts || [];
  } catch { return []; }
}
function pickCast(sex, stylePref) {
  const pool = loadCasts().filter(c => c.source?.sex === sex && c.publicPath);
  if (!pool.length) return null;
  const ranked = pool
    .map(c => ({ c, idx: stylePref.indexOf(c.source?.style || "") }))
    .sort((a, b) => (a.idx === -1 ? 999 : a.idx) - (b.idx === -1 ? 999 : b.idx));
  return ranked[0]?.c ?? pool[0] ?? null;
}

// ============================================================
// 상품 정의 (3개 여성패션)
// ============================================================
const PRODUCTS = [
  {
    slug: "wc-floral-dress",
    name: "Floral Print Chiffon Midi Dress",
    titleMarketing: "시폰 플라워 미디 원피스",
    titleInternal: "Floral Print Chiffon Midi Dress",
    brand: "SeoulLine",
    category: "여성의류 · 원피스",
    cost: 42.99, stylePref: ["STU", "HIG", "FML"],
    pid: "168868661", // 임시 CJ PID
    eyebrow: "LEXI CURATED · SPRING EDIT",
    subtitle: "바람이 스치는 순간, 꽃이 피다",
    lead: "화려하지 않아 오래 기억되는 플로럴 미디 드레스. 쉬폰이 살랑일 때마다 실루엣이 살아납니다.",
    usps: [
      { t: "시즌을 초월한 플로럴 패턴", d: "화사하지만 자극 없는 감각으로 어디에나 어울립니다." },
      { t: "부드러운 쉬폰 감", d: "가볍고 신축성 있는 소재가 바람에 우아하게 흩날립니다." },
      { t: "A라인 미디 실루엣", d: "체형을 편안하게 감싸는 자연스러운 핏." },
    ],
    story: [
      "LEXI Floral Print Chiffon Midi Dress는 시즌을 가르지 않는 플로럴 패턴과 부드러운 쉬폰 감이 만나 우아한 데일리룩을 완성합니다. 과장된 실루엣 없이 자연스러운 A라인이 체형을 편안하게 감싸줍니다.",
      "봄에서 초가을까지 긴 시즌 동안 레이어드하기 좋은 아이템. 데일리 오피스룩부터 주말 브런치, 야외 페스티벌까지 폭넓게 활용할 수 있습니다.",
    ],
    styling: [
      "크림색 블레이저 + 스트랩 샌들 — 오피스 캐주얼",
      "청키 니트 가디건 + 스니커즈 — 주말 레이어드",
      "골드 액세서리 + 미니 숄더백 — 저녁 자리",
    ],
    faq: [
      { q: "사이즈 선택 팁이 있나요?", a: "A라인 실루엣으로 정사이즈를 권장합니다." },
      { q: "소재 관리법은?", a: "드라이클리닝을 권장합니다. 찬물 중성세제 손세탁 가능." },
      { q: "반품·교환 정책은?", a: "단순 변심 시 왕복 국제 배송비 구매자 부담." },
    ],
    fit: "미디 기장 · A라인 · 여성",
    color: "스몰 플로럴 프린트",
    season: "봄·여름 데일리",
    cjThumbnailUrl: "https://picsum.photos/id/1018/720/720.webp",
  },
  {
    slug: "wc-silk-blouse",
    name: "Satin Button-Up Blouse",
    titleMarketing: "새틴 버튼업 블라우스",
    titleInternal: "Satin Button-Up Blouse",
    brand: "DAILYSEOUL",
    category: "여성의류 · 블라우스",
    cost: 38.9, stylePref: ["STU", "HIG", "FML"],
    pid: "168868662", // 임시 CJ PID
    eyebrow: "LEXI CURATED · SATIN EDIT",
    subtitle: "빛을 머금은 새틴, 우아함의 다른 이름",
    lead: "매끄러운 광택이 감도는 새틴 블라우스. 단추 하나까지 신경 쓴 디테일이 LEXI의 기준입니다.",
    usps: [
      { t: "은은한 광택의 새틴 소재", d: "고급스럽지만 과하지 않은 자연스러운 광택감." },
      { t: "클래식 버튼업 디자인", d: "정돈된 카라와 정교한 단추 배열이 완성하는 클래식한 무드." },
      { t: "데님부터 테일러드까지 매칭", d: "캐주얼과 포멀을 넘나드는 활용도 높은 아이템." },
    ],
    story: [
      "LEXI Satin Button-Up Blouse는 은은한 광택의 새틴 소재로 고급스러운 무드를 연출합니다. 깔끔한 버튼 배열과 정돈된 카라 디자인이 클래식하면서도 세련된 인상을 줍니다.",
      "오피스 룩의 정석부터 캐주얼 데님 매칭까지, 새틴의 광택이 더해질 때 매일의 옷차림이 한 단계 업그레이드됩니다.",
    ],
    styling: [
      "와이드 데님 + 화이트 스니커즈 — 캐주얼 새틴",
      "테일러드 팬츠 + 블레이저 — 오피스 룩",
      "미디 스커트 + 로퍼 — 데이트 룩",
    ],
    faq: [
      { q: "비침이 있나요?", a: "새틴 특성상 약간 비침 가능. 누드 톤 이너 착용 권장." },
      { q: "세탁 방법은?", a: "드라이클리닝 권장. 물세탁 시 광택 손상 가능." },
      { q: "교환·반품 기준은?", a: "하자 아닌 단순 변심도 일정 기간 내 교환 가능." },
    ],
    fit: "정사이즈 · 레귤러 핏 · 여성",
    color: "화이트/아이보리 새틴",
    season: "올시즌 데일리",
    cjThumbnailUrl: "https://picsum.photos/id/1015/720/720.webp",
  },
  {
    slug: "wc-knit-sweater",
    name: "Chunky Knit Pullover Sweater",
    titleMarketing: "청키 니트 풀오버 스웨터",
    titleInternal: "Chunky Knit Pullover Sweater",
    brand: "ATELIER 9",
    category: "여성의류 · 니트",
    cost: 52.0, stylePref: ["STR", "OUT", "STU"],
    pid: "168868663", // 임시 CJ PID
    eyebrow: "LEXI CURATED · KNIT EDIT",
    subtitle: "두툼한 매력, 가벼운 착용감",
    lead: "청키 니트의 볼륨감과 부드러운 촉감이 만나 완성하는 겨울의 클래식.",
    usps: [
      { t: "두툼한 청키 니트 짜임", d: "볼륨감 있는 실루엣이 주는 아늑하고 스타일리시한 무드." },
      { t: "오버사이즈 레이어드 핏", d: "넉넉한 품으로 안에 셔츠·티셔츠 레이어링이 자유롭습니다." },
      { t: "울 블렌드 보온 소재", d: "따뜻하면서도 부드러운 착용감으로 겨울철 데일리로." },
    ],
    story: [
      "LEXI Chunky Knit Pullover Sweater는 두툼한 짜임이 주는 아늑한 실루엣이 매력적인 아이템입니다. 오버사이즈 핏이 레이어드에 최적화되어 있습니다.",
      "울 블렌드 소재가 보온성과 부드러운 촉감을 모두 잡았습니다. 넉넉한 품과 리브 마감이 완성하는 실루엣은 캐주얼하면서도 정돈된 인상을 줍니다.",
    ],
    styling: [
      "와이드 코듀로이 팬츠 + 더비 슈즈 — 가을·겨울 캐주얼",
      "미니 스커트 + 롱부츠 — 페미닌 레이어드",
      "슬림 청바지 + 스니커즈 — 데일리 룩",
    ],
    faq: [
      { q: "보풀이 생기나요?", a: "울 블렌드 특성상 사용 시 보풀 가능. 보풀 제거기로 관리." },
      { q: "세탁 방법은?", a: "드라이클리닝 권장. 손세탁 시 찬물 중성세제." },
      { q: "사이즈감은?", a: "오버사이즈 핏. 평소보다 한 사이즈 작게 선택 가능." },
    ],
    fit: "오버사이즈 · 청키 니트 · 여성",
    color: "크림/베이지",
    season: "가을·겨울",
    cjThumbnailUrl: "https://picsum.photos/id/1016/720/720.webp",
  },
];

// ============================================================
// WAN (Alibaba Wan2.7) 헬퍼
// ============================================================
const WAN_API_KEY = process.env.WAN_API_KEY || process.env.DASHSCOPE_API_KEY;
const WAN_HOST = process.env.WAN_API_HOST || "ws-0yo9dfushj918w65.ap-southeast-1.maas.aliyuncs.com";
const WAN_MODEL = process.env.WAN_IMAGE_MODEL || "wan2.7-image";
if (!WAN_API_KEY) {
  console.error("FATAL: WAN_API_KEY not set in .env");
  process.exit(1);
}

async function wanT2I(prompt, size, seed) {
  const body = {
    model: WAN_MODEL,
    input: {
      messages: [{ role: "user", content: [{ text: prompt }] }],
    },
    parameters: { size, n: 1, watermark: false, thinking_mode: false, seed },
  };
  const url = `https://${WAN_HOST.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api/v1/services/aigc/multimodal-generation/generation`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.message || json.code || `HTTP ${res.status}`;
    throw new Error(`wan ${res.status}: ${String(msg).slice(0, 200)}`);
  }
  // extract image URL from response
  // extract image URL from response
  const url2 = extractWanImageUrl(json);
  if (!url2) throw new Error("wan: no image url in response");
  const imgRes = await fetch(url2);
  if (!imgRes.ok) throw new Error(`wan: failed to fetch image: ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

// wanT2I처럼 wanPostJson을 직접 호출하는 헬퍼 함수
async function wanEditImage(sourceUrl, instruction, timeoutMs) {
  const body = {
    model: WAN_MODEL, // WAN_MODEL은 이미 정의되어 있음
    input: {
      messages: [
        { role: "user", content: [{ image: sourceUrl }, { text: instruction }] },
      ],
    },
    parameters: {
      size: "1024*1024", // 기본값으로 설정. 필요시 파라미터로 받을 수 있음
      n: 1,
      watermark: false,
      thinking_mode: false,
    },
  };
  const url = `https://${WAN_HOST.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api/v1/services/aigc/multimodal-generation/generation`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs ?? 300_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.message || json.code || `HTTP ${res.status}`;
    throw new Error(`wan ${res.status}: ${String(msg).slice(0, 200)}`);
  }
  const url2 = extractWanImageUrl(json);
  if (!url2) throw new Error("wan: no image url in response");
  const imgRes = await fetch(url2);
  if (!imgRes.ok) throw new Error(`wan: failed to fetch image: ${imgRes.status}`);
  return { url: url2, buffer: Buffer.from(await imgRes.arrayBuffer()) }; // url과 buffer 모두 반환
}

function extractWanImageUrl(resp) {
  const output = resp.output || {};
  // DashScope response: output.choices[].message.content[].image
  const choices = output.choices || [];
  for (const c of choices) {
    const content = c.message?.content || [];
    for (const item of content) {
      if (item.image) return item.image;
      if (item.url) return item.url;
    }
  }
  const results = output.results || [];
  if (results.length) return results[0].url || results[0].image_url || null;
  const images = output.images || [];
  if (images.length) return images[0].url || images[0].image_url || null;
  if (output.image_url) return output.image_url;
  const data = resp.data || {};
  return data.image_url || null;
}

// ============================================================
// Sharp WebP 최적화
// ============================================================
async function opt(buf, w, h, q, pos = "centre") {
  return sharp(buf)
    .rotate()
    .resize(w, h, { fit: "cover", position: pos })
    .webp({ quality: q, alphaQuality: 80, effort: 6 })
    .toBuffer();
}

// ============================================================
// SAMPLE3 HTML 렌더러
// ============================================================
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function renderHtml(p, cast) {
  const sell = Math.ceil((p.cost + 20) * 1.3) - 0.1;
  const interestStr = (cast.interests || []).join(" · ");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(p.titleMarketing)} · LEXI</title>
<meta name="description" content="${esc(p.subtitle)} · LEXI Curated"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${esc(p.titleMarketing)}"/>
<meta property="og:description" content="${esc(p.subtitle)} · LEXI Curated"/>
<meta property="og:url" content="https://lexi-pdp-pages.vercel.app/${p.slug}/"/>
<meta property="og:image" content="./og-opt.webp"/>
<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="./og-opt.webp"/>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1,h2,h3{text-wrap:balance;letter-spacing:0;font-style:normal}a{color:inherit;text-decoration:none}
.top{max-width:760px;margin:0 auto;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}.nav{display:flex;gap:10px;align-items:center;font-size:12px;color:var(--fog)}.chip{border:1px solid var(--ink);padding:5px 11px;border-radius:999px;color:var(--ink);font-weight:600}
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
.gallery{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;padding:8px 24px}.gallery .tall{grid-row:span 2}
.gallery figure{margin:0;position:relative}.gallery img{width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;min-height:160px}
.gallery figcaption{position:absolute;left:10px;bottom:10px;background:rgba(26,26,26,.62);color:#fff;font-size:11px;padding:5px 9px;border-radius:999px;font-weight:600}
@media(max-width:640px){.gallery{grid-template-columns:1fr}.gallery .tall{grid-row:auto}}
.usps{list-style:none;margin:0;padding:0;display:grid;gap:12px}.usp{padding:16px;border:1px solid var(--line);border-radius:14px;display:grid;gap:6px;background:#fff}
.usp strong{font-size:14px}.usp span{font-size:13px;color:var(--fog);line-height:1.6}
.story p{margin:0 0 12px;font-size:14px;line-height:1.75}.story p:last-child{margin-bottom:0}
.styling{margin:0;padding-left:18px}.styling li{margin:8px 0;font-size:14px}
.spec{width:100%;border-collapse:collapse;font-size:13px}.spec th,.spec td{padding:11px 12px;border:1px solid var(--line);text-align:left}.spec th{background:#fff;width:34%;font-weight:700}
.faq{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 10px;background:#fff}.faq summary{font-weight:700;cursor:pointer;font-size:14px}.faq p{margin:10px 0 0;color:var(--fog);font-size:13px;line-height:1.65}
.brand-note{margin-top:18px;padding:16px;border-left:3px solid var(--accent);background:#fff;font-size:13px;line-height:1.65}
.cta-band{padding:32px 24px 40px;text-align:center;background:linear-gradient(180deg,#faf9f7 0%,#f3efe6 100%)}
.cta{display:inline-block;background:var(--accent);color:#fff;font-weight:800;padding:15px 42px;border-radius:14px;font-size:15px;transition:opacity .2s}.cta:hover{opacity:.85}.cta-sub{margin-top:12px;font-size:12px;color:var(--fog)}
.model-card{padding:18px 16px;border:1px solid var(--line);border-radius:14px;background:#fff;font-size:13px;line-height:1.65;color:var(--fog)}.model-card strong{color:var(--ink)}
.model-profile{display:grid;gap:10px;margin:0;padding:0;list-style:none}.model-profile li{display:grid;grid-template-columns:88px 1fr;gap:10px;align-items:baseline}
.model-profile .k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--fog);font-weight:700}.model-profile .v{color:var(--ink);font-size:14px}
.model-agency{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--fog)}.model-agency b{color:var(--ink)}
.og-card{margin:0}.og-card img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--line);aspect-ratio:1200/630;object-fit:cover;background:#fff}
.foot{max-width:760px;margin:0 auto 40px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
</style>
</head>
<body>
<header class="top"><div class="logo">LEXI<span>.</span></div><div class="nav"><span>Women's Fashion</span><span class="chip">SAMPLE3 · LEXI Curated</span></div></header>
<article class="wrap">
  <div class="brand-strip"><div><strong>LEXI</strong> · ${esc(p.subtitle)}</div><div>Curated by LEXI · ${esc(p.titleMarketing)}</div></div>
  <section class="hero">
    <img src="./assets/s1-hero-opt.webp" alt="${esc(p.titleMarketing)} — ${cast.name} wearing" loading="eager"/>
    <div class="hero-copy">
      <div class="eyebrow">${esc(p.eyebrow)}</div>
      <h1>${esc(p.titleMarketing)}</h1>
      <p class="sub">${esc(p.subtitle)}</p>
      <p class="lead">${esc(p.lead)}</p>
      <div class="price-row"><div class="price">USD ${sell.toFixed(1)}</div><div class="meta">${esc(p.category)}</div></div>
    </div>
  </section>
  <div class="gallery">
    <figure class="tall"><img src="./assets/s1-hero-opt.webp" alt=""/><figcaption>Hero</figcaption></figure>
    <figure><img src="./assets/s2-detail-opt.webp" alt=""/><figcaption>Detail</figcaption></figure>
    <figure><img src="./assets/s3-desire-opt.webp" alt=""/><figcaption>Desire</figcaption></figure>
  </div>
  <section class="pad">
    <p class="section-kicker">MODEL CAST</p>
    <h2 class="section-title">이 상품의 화보 모델</h2>
    <div class="model-card">
      <ul class="model-profile">
        <li><span class="k">이름</span><span class="v">${esc(cast.name)}</span></li>
        <li><span class="k">성별</span><span class="v">여성</span></li>
        <li><span class="k">국적</span><span class="v">${esc(cast.nationality)}</span></li>
        <li><span class="k">관심사</span><span class="v">${esc(interestStr)}</span></li>
      </ul>
      <div class="model-agency">소속사 <b>AMBA</b> <span style="color:var(--fog)">(AI Ambassador)</span></div>
    </div>
  </section>
  <section class="pad">
    <p class="section-kicker">SHARE · OG</p>
    <h2 class="section-title">LEXI OG 이미지</h2>
    <figure class="og-card"><img src="./og-opt.webp" alt="${esc(p.titleMarketing)} OG" width="1200" height="630"/></figure>
  </section>
  <section class="pad">
    <p class="section-kicker">WHY LEXI</p>
    <h2 class="section-title">세 가지로 정리한 포인트</h2>
    <ul class="usps">${p.usps.map(u => `<li class="usp"><strong>${esc(u.t)}</strong><span>${esc(u.d)}</span></li>`).join("")}</ul>
  </section>
  <section class="pad story" style="padding-top:8px">
    <p class="section-kicker">STORY</p>
    <h2 class="section-title">LEXI가 고른 오늘의 아이템</h2>
    ${p.story.map(s => `<p>${esc(s)}</p>`).join("")}
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">STYLING</p>
    <h2 class="section-title">스타일링 노트</h2>
    <ul class="styling">${p.styling.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>LEXI</td></tr>
      <tr><th>Product</th><td>${esc(p.titleMarketing)}</td></tr>
      <tr><th>Internal name</th><td>${esc(p.titleInternal)}</td></tr>
      <tr><th>Fit</th><td>${esc(p.fit)}</td></tr>
      <tr><th>Color</th><td>${esc(p.color)}</td></tr>
      <tr><th>Season</th><td>${esc(p.season)}</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</div>
  </section>
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${p.faq.map(x => `<details class="faq"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}
  </section>
  <section class="cta-band">
    <a class="cta" href="#cart">LEXI 장바구니 담기</a>
    <p class="cta-sub">LEXI Curated · 관세 포함가</p>
  </section>
</article>
<p class="foot">© LEXI · ${esc(p.category)} · SAMPLE3 · AMBA</p>
</body>
</html>`;
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const OUT = path.join(process.cwd(), "pdp-site");
  // 하나의 AMBA 캐스트를 모든 상품에 동일하게 적용
  const castAll = pickCast("F", ["STU", "HIG", "FML", "OUT"]);
  console.log(`AMBA 캐스트: ${castAll?.name ?? "NONE"} (${castAll?.nationality ?? "N/A"})`);
  if (!castAll) { console.error("FATAL: no female cast found"); process.exit(1); }

  for (const p of PRODUCTS) {
    console.log(`\n===== ${p.slug} (${p.titleMarketing}) =====`);
    const cast = castAll;
    console.log(`  Cast: ${cast.name} (${cast.nationality})`);

    const dir = path.join(OUT, p.slug, "assets");
    fs.mkdirSync(dir, { recursive: true });

    // 제품 ID 해시로 seed 생성
    const id = PRODUCTS.indexOf(p) + 1;

    // === S1 Hero (portrait) ===
    console.log("  [S1] Hero generating...");
    const heroPrompt =
      `Young female fashion editorial model, soft natural makeup, ` +
      `wearing the ${p.name} garment as main outfit, ` +
      `upper body shot, looking at camera, ` +
      `cream-paper studio background (#faf9f7), ` +
      `soft diffused studio light, K-fashion editorial lookbook style, ` +
      `photorealistic, high detail fabric texture, ` +
      `no text, no logos, no watermarks, no other people`;
    const heroRaw = await wanT2I(heroPrompt, "768*1344", id * 1000 + 1);
    const heroOpt = await opt(heroRaw, 960, 1200, 78, "north");
    fs.writeFileSync(path.join(dir, "s1-hero-opt.webp"), heroOpt);
    console.log(`  ✓ S1 Hero: ${Math.round(heroOpt.length / 1024)}KB`);

    // === S2 Detail (square) ===
    console.log("  [S2] Detail (CJ 썸네일) 불러오는 중...");
    let detailImageUrl = p.cjThumbnailUrl; // 기본적으로 PRODUCTS에 설정된 URL 사용
    try {
      const cjProduct = await cjConnector.getProduct(p.pid);
      if (cjProduct && cjProduct.images.length > 0) {
        detailImageUrl = cjProduct.images[0].url;
      } else {
        console.warn(`  WARN: CJ Product not found or no images for PID ${p.pid}. Falling back to default CJ Thumbnail URL.`);
      }
    } catch (error) {
      console.error(`  ERROR: Failed to fetch CJ Product for PID ${p.pid}: ${error.message}. Falling back to default CJ Thumbnail URL.`);
    }
    const detailRaw = Buffer.from(await (await fetch(detailImageUrl)).arrayBuffer());
    const detailOpt = await opt(detailRaw, 720, 720, 78);
    fs.writeFileSync(path.join(dir, "s2-detail-opt.webp"), detailOpt);
    console.log(`  ✓ S2 Detail: ${Math.round(fs.statSync(path.join(dir, "s2-detail-opt.webp")).size / 1024)}KB`);

    // === S3 Desire (portrait) ===
    console.log("  [S3] Desire generating...");
    console.log("    >> Calling wanEditImage for S3 Desire...");
    const heroRawDataUrl = `data:image/webp;base64,${heroRaw.toString('base64')}`;

    const desireInstruction =
      `A warm minimal lifestyle setting, candid everyday moment, ` +
      `soft natural side light, cozy interior or outdoor plaza. ` +
      `Keep the same model with long dark wavy hair and a gentle smile, and the same ${p.name} garment.`;

    const desireResult = await wanEditImage(heroRawDataUrl, desireInstruction, 600_000);
    const desireRaw = desireResult.buffer;
    const desireOpt = await opt(desireRaw, 960, 1200, 75, "north");
    fs.writeFileSync(path.join(dir, "s3-desire-opt.webp"), desireOpt);
    console.log(`  ✓ S3 Desire: ${Math.round(desireOpt.length / 1024)}KB`);

    // === OG (landscape) ===
    console.log("  [OG] Generating...");
    const ogBuf = await sharp(heroRaw)
      .resize(1200, 630, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT, p.slug, "og-opt.webp"), ogBuf);
    console.log(`  ✓ OG: ${Math.round(ogBuf.length / 1024)}KB`);

    // === HTML ===
    const html = renderHtml(p, cast);
    fs.writeFileSync(path.join(OUT, p.slug, "index.html"), html, "utf8");
    console.log(`  ✓ HTML saved`);

    const elapsed = ((Date.now() - tStart) / 1000).toFixed(0);
    console.log(`  >> ${p.slug} done in ${elapsed}s`);
  }

  // 인덱스
  const indexHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SAMPLE3 · AMBA 여성패션 | LEXI</title>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1{text-wrap:balance;letter-spacing:0}.logo-wrap{max-width:820px;margin:0 auto;padding:28px 20px 0}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}
h1{font-size:22px;margin:8px 0 4px;font-weight:800}
.desc{color:var(--fog);font-size:13px;margin:0 0 32px}
.grid{max-width:820px;margin:0 auto;padding:0 20px 56px;display:grid;gap:20px;grid-template-columns:1fr}
@media(min-width:640px){.grid{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--paper);border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);text-decoration:none;color:var(--ink);display:block;transition:transform .2s}
.card:hover{transform:translateY(-4px)}
.card-img{width:100%;aspect-ratio:4/5;overflow:hidden}.card-img img{width:100%;height:100%;object-fit:cover;display:block}
.card-body{padding:14px}.card-brand{font-size:11px;color:var(--fog);font-weight:600;margin:0 0 4px}
.card-body h3{font-size:14px;margin:0 0 4px;font-weight:700;line-height:1.4}
.card-price{font-size:17px;font-weight:800;margin:4px 0}.card-cast{font-size:11px;color:var(--fog);margin:4px 0}
.card-badge{display:inline-block;margin-top:8px;padding:3px 8px;border:1px solid var(--accent);border-radius:999px;font-size:10px;font-weight:700;color:var(--accent)}
.foot{max-width:820px;margin:0 auto 32px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
</style>
</head>
<body>
<div class="logo-wrap"><div class="logo">LEXI<span>.</span></div>
<h1>SAMPLE3 · AMBA 여성패션</h1>
<p class="desc">AMBA 모델 화보와 LEXI 에디토리얼 스타일로 준비한 3가지 여성의류 상품페이지</p></div>
<div class="grid">
${PRODUCTS.map(p => {
  const sell = Math.ceil((p.cost + 20) * 1.3) - 0.1;
  const cast = castAll;
  const castName = `${cast?.name ?? "AMBA"} (AMBA)`;
  return `<a href="./${p.slug}/" class="card">
    <div class="card-img" style="background:var(--line)"><img src="./${p.slug}/assets/s1-hero-opt.webp" alt="${esc(p.titleMarketing)}" loading="lazy"/></div>
    <div class="card-body">
      <p class="card-brand">${esc(p.brand)}</p>
      <h3>${esc(p.titleMarketing)}</h3>
      <p class="card-price">USD ${sell.toFixed(1)}</p>
      <p class="card-cast">Model · ${esc(castName)}</p>
      <span class="card-badge">SAMPLE3</span>
    </div>
  </a>`;
}).join("\n")}
</div>
<p class="foot">© LEXI · SAMPLE3 · AMBA (AI Ambassador)</p>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT, "index.html"), indexHtml, "utf8");
  console.log(`\n===== ALL DONE =====`);
}

const tStart = Date.now();
main().catch(err => { console.error("FATAL:", err); process.exit(1); });
