#!/usr/bin/env npx tsx
/**
 * SAMPLE3 PDP — Men's Mid-length Faux Two-piece Trench Coat (CJ pid 2609210703401633200)
 * S1: AI 생성 원본(raw-s1.*) → 960×1200 north / S2: CJ 썸네일 / S3·OG: S1 크롭
 * Usage: npx tsx scripts/gen-sample3-trench-pdp.ts <raw-s1-path>
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SLUG = "mens-faux-two-piece-trench-coat";
const OUT = join(process.cwd(), "pdp-site", SLUG);
const CJ_THUMB = "https://cf.cjdropshipping.com/quick/product/2f64b09a-31e4-475b-9b66-faba1651919c.jpg";
const COST_USD = 21.7;

/** (cost + 20) × 1.3 → x.9 */
function sellPrice(cost: number) {
  const raw = (cost + 20) * 1.3;
  return Math.floor(raw) + 0.9;
}

export const P = {
  slug: SLUG,
  titleInternal: "Men's Mid-length Faux Two-piece Trench Coat",
  titleMarketing: "후드 레이어드 롱 트렌치코트",
  titleEn: "Hooded Layered Long Coat",
  sellUsd: sellPrice(COST_USD),
  categoryKo: "남성의류 · 아우터",
  cast: {
    name: "김도윤 · Kim Doyoon",
    gender: "남성",
    nationality: "대한민국",
    interests: ["스트리트", "스니커즈", "시티 산책"],
  },
  copy: {
    eyebrow: "LEXI CURATED · OUTER EDIT",
    subtitle: "한 벌로 두 겹, 레이어드가 완성되는 코트",
    lead: "블랙 롱코트 안에 베이지 후드와 플래킷이 겹쳐 보이는 페이크 투피스 디자인. 따로 껴입지 않아도 레이어드 룩이 완성됩니다.",
    story: [
      "LEXI 후드 레이어드 롱 트렌치코트는 블랙 울 블렌드 바디에 베이지 후드와 앞 여밈을 덧댄 페이크 투피스 구조입니다. 이너를 하나 더 입은 듯한 깊이감을 주면서도 착용은 한 벌처럼 간편합니다.",
      "무릎 위로 떨어지는 미드 기장과 여유 있는 품이 체형을 편안하게 감싸고, 소매 끝 고무 밴딩이 바람을 막아 줍니다. 터틀넥·슬랙스와는 미니멀하게, 후디·와이드 팬츠와는 스트리트하게 연출할 수 있습니다.",
    ],
    usps: [
      { t: "페이크 투피스 레이어드", d: "베이지 후드와 플래킷이 덧대어져 한 벌로 레이어드 룩이 완성됩니다." },
      { t: "울 블렌드 미드 기장", d: "80~100cm 기장의 울 블렌드 원단이 가을·겨울 보온과 실루엣을 함께 챙깁니다." },
      { t: "후드 + 밴딩 소매", d: "탈착 걱정 없는 일체형 후드와 고무 밴딩 소매로 찬바람을 막아 줍니다." },
    ],
    styling: [
      "블랙 터틀넥 + 블랙 슬랙스 + 더비 슈즈 — 미니멀 시티룩",
      "그레이 후디 + 와이드 데님 + 스니커즈 — 주말 스트리트",
      "니트 베스트 + 셔츠 + 코튼 팬츠 — 클래식 레이어드",
    ],
    faq: [
      { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈로 일반 해외 브랜드보다 1~2 사이즈 작게 나옵니다. 평소 사이즈보다 한 사이즈 크게 선택하시는 것을 권장합니다." },
      { q: "후드는 분리되나요?", a: "후드와 앞 플래킷은 코트와 일체형으로 봉제된 페이크 투피스 구조라 분리되지 않습니다." },
      { q: "세탁은 어떻게 하나요?", a: "울 블렌드 소재로 드라이클리닝을 권장합니다. 보관 시에는 어깨 형태가 유지되는 옷걸이를 사용해 주세요." },
      { q: "배송과 교환·반품은?", a: "LEXI 소싱 해외배송 상품으로 영업일 기준 7~14일 내 도착합니다. 교환·반품 시 해외배송 왕복비용 48,000원이 공제되며, 제품 하자의 경우 절반을 판매자가 부담해 24,000원이 공제됩니다." },
    ],
  },
  spec: {
    fit: "미드 기장(80~100cm) · 루즈핏 · 후드 일체형 · 남성",
    color: "블랙 / 아프리콧",
    season: "가을·겨울 데일리 아우터",
    material: "겉감 울 블렌드(비스코스) · 안감 폴리에스터",
    size: "M · L · XL · 2XL · 3XL",
    care: "드라이클리닝 권장",
  },
};

async function webp(input: sharp.Sharp, w: number, h: number, q: number, file: string) {
  await input.resize(w, h, { fit: "cover", position: "north" }).webp({ quality: q, effort: 6 }).toFile(file);
}

async function buildImages(rawS1: string) {
  mkdirSync(join(OUT, "assets"), { recursive: true });
  const hero = await sharp(readFileSync(rawS1)).rotate().resize(960, 1200, { fit: "cover", position: "north" }).toBuffer();
  await sharp(hero).webp({ quality: 78, effort: 6 }).toFile(join(OUT, "assets", "s1-hero-opt.webp"));

  const thumb = Buffer.from(await (await fetch(CJ_THUMB)).arrayBuffer());
  await sharp(thumb).resize(720, 720, { fit: "cover", position: "center" }).webp({ quality: 78, effort: 6 })
    .toFile(join(OUT, "assets", "s2-detail-opt.webp"));

  // S3: 얼굴 포함 상반신 클로즈업 (4:5)
  const cw = 600, ch = 750;
  await webp(sharp(hero).extract({ left: 180, top: 24, width: cw, height: ch }), 960, 1200, 75,
    join(OUT, "assets", "s3-desire-opt.webp"));

  // OG: 코트 바디(중앙·하단) 클로즈업 (1200:630)
  await sharp(hero).extract({ left: 120, top: 420, width: 760, height: 399 })
    .resize(1200, 630, { fit: "cover" }).webp({ quality: 80, effort: 6 }).toFile(join(OUT, "og-opt.webp"));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildHtml(baseUrl: string) {
  const c = P.copy;
  const og = `${baseUrl}/${SLUG}/og-opt.webp`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(P.titleMarketing)} · LEXI</title>
<meta name="description" content="${esc(c.subtitle)} · LEXI Curated"/>
<meta property="og:type" content="product"/>
<meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${esc(P.titleMarketing)} · ${esc(P.titleEn)}"/>
<meta property="og:description" content="${esc(c.subtitle)}"/>
<meta property="og:image" content="${og}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1,h2,h3{text-wrap:balance;letter-spacing:0;font-style:normal}
.top{max-width:760px;margin:0 auto;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}
.nav{font-size:12px;color:var(--fog)}
.wrap{max-width:760px;margin:0 auto 56px;background:var(--paper);box-shadow:0 18px 50px rgba(0,0,0,.08)}
.brand-strip{padding:14px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--fog)}.brand-strip strong{color:var(--ink)}
.hero img{width:100%;display:block;aspect-ratio:4/5;object-fit:cover}
.hero-copy{padding:28px 24px 8px;text-align:center}
.eyebrow{font-size:11px;letter-spacing:.12em;color:var(--accent);font-weight:700;margin-bottom:10px}
.hero-copy h1{font-size:clamp(26px,5vw,34px);margin:0 0 10px;font-weight:800;line-height:1.3}
.sub{color:var(--fog);font-size:15px;margin:0 0 14px}.lead{max-width:40ch;margin:0 auto;line-height:1.7}
.price-row{display:flex;justify-content:center;align-items:baseline;gap:12px;margin-top:18px}
.price{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}.meta{font-size:12px;color:var(--fog)}
.pad{padding:28px 24px}.section-kicker{font-size:11px;letter-spacing:.1em;color:var(--accent);font-weight:700;margin:0 0 8px}
.section-title{font-size:20px;margin:0 0 14px;font-weight:800}
.gallery{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;padding:8px 24px}.gallery .tall{grid-row:span 2}
.gallery figure{margin:0;position:relative}.gallery img{width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;min-height:160px}
.gallery figcaption{position:absolute;left:10px;bottom:10px;background:rgba(26,26,26,.62);color:#fff;font-size:12px;padding:5px 9px;border-radius:999px;font-weight:600}
@media(max-width:640px){.gallery{grid-template-columns:1fr}.gallery .tall{grid-row:auto}}
.model-card{padding:18px 16px;border:1px solid var(--line);border-radius:14px;background:#fff}
.model-profile{display:grid;gap:10px;margin:0;padding:0;list-style:none}.model-profile li{display:grid;grid-template-columns:88px 1fr;gap:10px}
.model-profile .k{font-size:12px;color:var(--fog);font-weight:700}.model-profile .v{font-size:14px}
.og-card{margin:0}.og-card img{width:100%;display:block;border-radius:14px;border:1px solid var(--line);aspect-ratio:1200/630;object-fit:cover}
.usps{list-style:none;margin:0;padding:0;display:grid;gap:12px}.usp{padding:16px;border:1px solid var(--line);border-radius:14px;display:grid;gap:6px;background:#fff}
.usp span{font-size:13px;color:var(--fog);line-height:1.6}
.story p{margin:0 0 12px;line-height:1.75}
.styling{margin:0;padding-left:18px}.styling li{margin:8px 0}
.spec{width:100%;border-collapse:collapse;font-size:13px}.spec th,.spec td{padding:11px 12px;border:1px solid var(--line);text-align:left}.spec th{background:#fff;width:34%}
.brand-note{margin-top:18px;padding:16px;border-left:3px solid var(--accent);background:#fff;font-size:13px}
.faq{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 10px;background:#fff}.faq summary{font-weight:700;cursor:pointer}.faq p{margin:10px 0 0;color:var(--fog);font-size:13px;line-height:1.65}
.cta-band{padding:32px 24px 40px;text-align:center;background:linear-gradient(180deg,#faf9f7 0%,#f3efe6 100%)}
.cta{display:inline-block;background:var(--accent);color:#fff;font-weight:800;padding:15px 42px;border-radius:14px;font-size:15px;text-decoration:none}
.cta-sub{margin-top:12px;font-size:12px;color:var(--fog)}
.foot{max-width:760px;margin:0 auto 40px;padding:0 20px;font-size:12px;color:var(--fog);text-align:center}
</style>
</head>
<body>
<header class="top"><div class="logo">LEXI<span>.</span></div><div class="nav">Men's Outerwear</div></header>
<article class="wrap">
  <div class="brand-strip" data-block="brand"><div><strong>LEXI</strong> · ${esc(c.subtitle)}</div><div>Curated by LEXI</div></div>

  <section class="hero" data-block="hero">
    <img src="./assets/s1-hero-opt.webp" alt="${esc(P.titleMarketing)}" loading="eager"/>
    <div class="hero-copy">
      <div class="eyebrow">${esc(c.eyebrow)}</div>
      <h1>${esc(P.titleMarketing)}</h1>
      <p class="sub">${esc(c.subtitle)}</p>
      <p class="lead">${esc(c.lead)}</p>
      <div class="price-row"><div class="price">USD ${P.sellUsd.toFixed(1)}</div><div class="meta">${esc(P.categoryKo)}</div></div>
    </div>
  </section>

  <div class="gallery" data-block="gallery">
    <figure class="tall"><img src="./assets/s1-hero-opt.webp" alt="Hero"/><figcaption>Hero</figcaption></figure>
    <figure><img src="./assets/s2-detail-opt.webp" alt="Detail"/><figcaption>Detail</figcaption></figure>
    <figure><img src="./assets/s3-desire-opt.webp" alt="Desire"/><figcaption>Desire</figcaption></figure>
  </div>

  <section class="pad" data-block="model-cast">
    <p class="section-kicker">MODEL CAST</p>
    <h2 class="section-title">이 상품의 화보 모델</h2>
    <div class="model-card"><ul class="model-profile">
      <li><span class="k">이름</span><span class="v">${esc(P.cast.name)}</span></li>
      <li><span class="k">성별</span><span class="v">${P.cast.gender}</span></li>
      <li><span class="k">국적</span><span class="v">${P.cast.nationality}</span></li>
      <li><span class="k">관심사</span><span class="v">${esc(P.cast.interests.join(" · "))}</span></li>
      <li><span class="k">소속사</span><span class="v">AMBA (AI Ambassador)</span></li>
    </ul></div>
  </section>

  <section class="pad" data-block="og">
    <p class="section-kicker">LOOK</p>
    <h2 class="section-title">${esc(P.titleEn)}</h2>
    <figure class="og-card"><img src="./og-opt.webp" alt="${esc(P.titleMarketing)}" width="1200" height="630"/></figure>
  </section>

  <section class="pad" data-block="usp">
    <p class="section-kicker">WHY LEXI</p>
    <h2 class="section-title">세 가지로 정리한 포인트</h2>
    <ul class="usps">${c.usps.map((u) => `<li class="usp"><strong>${esc(u.t)}</strong><span>${esc(u.d)}</span></li>`).join("")}</ul>
  </section>

  <section class="pad story" data-block="story">
    <p class="section-kicker">STORY</p>
    <h2 class="section-title">LEXI가 고른 이번 시즌 아우터</h2>
    ${c.story.map((s) => `<p>${esc(s)}</p>`).join("")}
  </section>

  <section class="pad" data-block="styling">
    <p class="section-kicker">STYLING</p>
    <h2 class="section-title">스타일링 노트</h2>
    <ul class="styling">${c.styling.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
  </section>

  <section class="pad" data-block="spec">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>LEXI</td></tr>
      <tr><th>Product</th><td>${esc(P.titleMarketing)}</td></tr>
      <tr><th>Internal name</th><td>${esc(P.titleInternal)}</td></tr>
      <tr><th>Fit</th><td>${esc(P.spec.fit)}</td></tr>
      <tr><th>Color</th><td>${esc(P.spec.color)}</td></tr>
      <tr><th>Season</th><td>${esc(P.spec.season)}</td></tr>
      <tr><th>Material</th><td>${esc(P.spec.material)}</td></tr>
      <tr><th>Size</th><td>${esc(P.spec.size)}</td></tr>
      <tr><th>Care</th><td>${esc(P.spec.care)}</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</div>
  </section>

  <section class="pad" data-block="faq">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${c.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
  </section>

  <section class="cta-band" data-block="cta">
    <a class="cta" href="https://lexistyle.vercel.app">LEXI에서 구매하기</a>
    <p class="cta-sub">LEXI Curated · 해외배송</p>
  </section>
</article>
<p class="foot">© LEXI · ${esc(P.categoryKo)}</p>
</body>
</html>`;
}

async function main() {
  const raw = process.argv[2];
  if (!raw) throw new Error("usage: gen-sample3-trench-pdp.ts <raw-s1-path>");
  await buildImages(raw);
  const base = process.env.PDP_SITE_URL ?? "https://pdp-site.vercel.app";
  writeFileSync(join(OUT, "index.html"), buildHtml(base), "utf8");
  console.log(JSON.stringify({ out: `pdp-site/${SLUG}`, sellUsd: P.sellUsd }));
}

if (process.argv[1]?.includes("gen-sample3-trench-pdp")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
