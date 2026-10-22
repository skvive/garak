/**
 * SAMPLE3-style full editorial PDP for LEXI1 heart tee (~1.5×, brand-forward).
 * Page style canon: docs/lexi-sample3-pdp-style.md · src/lib/hq/seeds/sample3-style.ts
 * Usage: npx tsx scripts/make-lexi1-pdp.ts → public/sample3/
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import {
  LEXI1_ID,
  LEXI1_PRODUCT,
  LEXI1_MOCK_ASSETS,
  LEXI1_COPY_RULES,
  lexi1ConceptSpec,
} from "../src/lib/hq/seeds/lexi1-heart-tee";
import { sample3OgPreviewHtml } from "../src/lib/hq/seeds/sample3-style";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "lexi1-pdp");

const COPY = {
  eyebrow: "LEXI CURATED · BASICS WITH A HEART",
  subtitle: "검정 티 위에 앉힌, 아주 작은 설렘",
  lead: "민무늬만 반복되던 옷장에, LEXI가 고른 핑크 하트 하나를 더합니다. 통기 좋은 반팔로 데일리를 가볍게, 그러나 분명하게.",
  story: [
    "LEXI 하트 자수 통기 반팔 티는 라운드넥·기본핏의 익숙한 실루엣 위에, 좌측 가슴의 미니 핑크 하트로 표정을 바꿉니다. 과장 없는 자수 포인트가 사진과 실착 모두에서 담백한 설렘을 만듭니다.",
    "여름 데일리로 설계된 가벼운 코튼 감. 데님에 넣어 입거나, 스커트와 레이어해도 군더더기 없이 정리됩니다. 브랜드 문법의 중심은 언제나 LEXI.",
  ],
  usps: [
    { t: "통기 좋은 여름 코튼 감", d: "더운 날에도 가볍게 스치는 착용감으로 데일리를 이어 갑니다." },
    { t: "핑크 하트 자수 포인트", d: "좌측 가슴의 작은 자수가 LEXI만의 담백한 표정을 만듭니다." },
    { t: "기본핏으로 폭넓은 매칭", d: "데님·스커트·얇은 셔츠 레이어까지 자연스럽게." },
  ],
  styling: [
    "라이트 블루 데님 + 화이트 스니커즈 — 주말 카페 룩",
    "블랙 미니 스커트 + 얇은 가디건 — 저녁 약속",
    "스트레이트 슬랙스 + 로퍼 — 오피스 캐주얼",
  ],
  faq: [
    { q: "사이즈는 어떻게 고르나요?", a: "기본핏입니다. 평소 티셔츠 사이즈를 선택하세요. 어깨선이 떨어지지 않는 정사이즈를 권합니다." },
    { q: "세탁·관리는?", a: "뒤집어서 찬물 단독 세탁을 권장합니다. 강한 건조기와 표백은 피해주세요. 하트 자수 부분이 쓸리지 않게 그물망을 사용하면 좋습니다." },
    { q: "배송·반품은?", a: "결제 확인 후 출고됩니다. 미사용·택 유지 시 안내된 기간 내 반품이 가능합니다. 자세한 조건은 주문 단계에서 확인하세요." },
  ],
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "assets"), { recursive: true });

  const assets = [
    { src: LEXI1_MOCK_ASSETS.s1Hero, dest: "s1-hero.png", label: "Hero" },
    { src: LEXI1_MOCK_ASSETS.s2Detail, dest: "s2-detail.png", label: "Detail" },
    { src: LEXI1_MOCK_ASSETS.s3Desire, dest: "s3-desire.png", label: "Desire" },
  ];
  for (const a of assets) {
    const from = join(process.cwd(), a.src);
    if (!existsSync(from)) throw new Error(`missing ${a.src}`);
    copyFileSync(from, join(OUT, "assets", a.dest));
  }

  const concept = lexi1ConceptSpec();
  writeFileSync(
    join(OUT, "meta.json"),
    JSON.stringify({ ruleset: LEXI1_ID, version: "1.5", product: LEXI1_PRODUCT, concept, copyRules: LEXI1_COPY_RULES }, null, 2),
    "utf8",
  );

  const uspHtml = COPY.usps
    .map(
      (u) => `<li class="usp"><strong>${esc(u.t)}</strong><span>${esc(u.d)}</span></li>`,
    )
    .join("");
  const styleHtml = COPY.styling.map((s) => `<li>${esc(s)}</li>`).join("");
  const faqHtml = COPY.faq
    .map(
      (f) =>
        `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`,
    )
    .join("");
  const storyHtml = COPY.story.map((p) => `<p>${esc(p)}</p>`).join("");

  const brandedHero = existsSync(join(process.cwd(), "public", "sample3", "assets", "s1-hero-brand.jpg"))
    ? "s1-hero-brand.jpg"
    : existsSync(join(OUT, "assets", "s1-hero-brand.png"))
      ? "s1-hero-brand.png"
      : "s1-hero.png";
  const ogAbs = "https://lexistyle.vercel.app/sample3/og.jpg?v=2";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(LEXI1_PRODUCT.title)} · LEXI</title>
<meta name="description" content="담백한 설렘 · 하트 자수 통기 반팔 · LEXI Curated"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${esc(LEXI1_PRODUCT.title)}"/>
<meta property="og:description" content="담백한 설렘 · 하트 자수 통기 반팔 · LEXI Curated"/>
<meta property="og:url" content="https://lexistyle.vercel.app/sample3"/>
<meta property="og:image" content="${ogAbs}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${ogAbs}"/>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1,h2,h3{text-wrap:balance;letter-spacing:0;font-style:normal}
a{color:inherit;text-decoration:none}
.top{max-width:760px;margin:0 auto;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}
.nav{display:flex;gap:10px;align-items:center;font-size:12px;color:var(--fog)}
.chip{border:1px solid var(--ink);padding:5px 11px;border-radius:999px;color:var(--ink);font-weight:600}
.wrap{max-width:760px;margin:0 auto 56px;background:var(--paper);box-shadow:0 18px 50px rgba(0,0,0,.08)}
.brand-strip{padding:14px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--fog)}
.brand-strip strong{color:var(--ink);font-weight:700}
.hero{padding:8px 0 0}
.hero img{width:100%;display:block;aspect-ratio:4/5;object-fit:cover}
.hero-copy{padding:28px 24px 8px;text-align:center}
.eyebrow{font-size:11px;letter-spacing:.12em;color:var(--accent);font-weight:700;margin-bottom:10px}
.hero-copy h1{font-size:clamp(26px,5vw,34px);margin:0 0 10px;font-weight:800;line-height:1.25}
.sub{color:var(--fog);font-size:15px;margin:0 0 14px}
.lead{max-width:38ch;margin:0 auto;color:var(--ink);font-size:14px;line-height:1.7}
.price-row{display:flex;justify-content:center;align-items:baseline;gap:12px;margin-top:18px}
.price{font-size:22px;font-weight:800}.meta{font-size:12px;color:var(--fog)}
.pad{padding:28px 24px}
.section-kicker{font-size:11px;letter-spacing:.1em;color:var(--accent);font-weight:700;margin:0 0 8px}
.section-title{font-size:20px;margin:0 0 14px;font-weight:800}
.gallery{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;padding:8px 24px 8px}
.gallery .tall{grid-row:span 2}
.gallery figure{margin:0;position:relative}
.gallery img{width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;min-height:160px}
.gallery figcaption{position:absolute;left:10px;bottom:10px;background:rgba(26,26,26,.62);color:#fff;font-size:11px;padding:5px 9px;border-radius:999px;font-weight:600}
@media(max-width:640px){.gallery{grid-template-columns:1fr}.gallery .tall{grid-row:auto}}
.usps{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.usp{padding:16px;border:1px solid var(--line);border-radius:14px;display:grid;gap:6px;background:#fff}
.usp strong{font-size:14px}.usp span{font-size:13px;color:var(--fog);line-height:1.6}
.story p{margin:0 0 12px;font-size:14px;line-height:1.75}
.story p:last-child{margin-bottom:0}
.styling{margin:0;padding-left:18px}.styling li{margin:8px 0;font-size:14px}
.spec{width:100%;border-collapse:collapse;font-size:13px}
.spec th,.spec td{padding:11px 12px;border:1px solid var(--line);text-align:left}
.spec th{background:#fff;width:34%;font-weight:700}
.faq{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 10px;background:#fff}
.faq summary{font-weight:700;cursor:pointer}.faq p{margin:10px 0 0;color:var(--fog);font-size:13px;line-height:1.65}
.brand-note{margin-top:18px;padding:16px;border-left:3px solid var(--accent);background:#fff;font-size:13px;line-height:1.65}
.cta-band{padding:32px 24px 40px;text-align:center;background:linear-gradient(180deg,#faf9f7 0%,#f3efe6 100%)}
.cta{display:inline-block;background:var(--accent);color:#fff;font-weight:800;padding:15px 42px;border-radius:14px;font-size:15px}
.cta-sub{margin-top:12px;font-size:12px;color:var(--fog)}
.foot{max-width:760px;margin:0 auto 40px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
.mock-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mock-grid figure{margin:0}.mock-grid img{width:100%;border-radius:12px;aspect-ratio:1;object-fit:cover;display:block}
.mock-grid figcaption{font-size:12px;text-align:center;margin-top:6px;color:var(--fog)}
@media(max-width:640px){.mock-grid{grid-template-columns:1fr}}
.og-card{margin:0}
.og-card img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--line);aspect-ratio:1200/630;object-fit:cover;background:#fff}
.og-card figcaption{margin-top:10px;font-size:12px;color:var(--fog);line-height:1.6}
</style>
</head>
<body>
<header class="top">
  <div class="logo">LEXI<span>.</span></div>
  <div class="nav"><span>Women's Fashion</span><span class="chip">${esc(LEXI1_ID)}</span></div>
</header>
<article class="wrap">
  <div class="brand-strip">
    <div><strong>LEXI</strong> · 담백한 설렘을 입는 방법</div>
    <div>Curated by LEXI · Heart Tee</div>
  </div>

  <section class="hero">
    <img src="./assets/${brandedHero}" alt="${esc(LEXI1_PRODUCT.title)}"/>
    <div class="hero-copy">
      <div class="eyebrow">${esc(COPY.eyebrow)}</div>
      <h1>${esc(LEXI1_PRODUCT.title)}</h1>
      <p class="sub">${esc(COPY.subtitle)}</p>
      <p class="lead">${esc(COPY.lead)}</p>
      <div class="price-row">
        <div class="price">${esc(LEXI1_PRODUCT.price)}</div>
        <div class="meta">BLACK · 기본핏 · 여름용</div>
      </div>
    </div>
  </section>

  <div class="gallery">
    <figure class="tall"><img src="./assets/${brandedHero}" alt=""/><figcaption>LEXI Hero</figcaption></figure>
    <figure><img src="./assets/s2-detail.png" alt=""/><figcaption>Detail</figcaption></figure>
    <figure><img src="./assets/s3-desire.png" alt=""/><figcaption>Desire</figcaption></figure>
  </div>

  <section class="pad">
    <p class="section-kicker">BRAND MARK</p>
    <h2 class="section-title">가슴에 앉힌 LEXI</h2>
    <div class="mock-grid">
      <figure><img src="./mockups/brand-mock-a.jpg" alt="시안 A"/><figcaption>A · Minimal (적용)</figcaption></figure>
      <figure><img src="./mockups/brand-mock-b.jpg" alt="시안 B"/><figcaption>B · Stacked</figcaption></figure>
      <figure><img src="./mockups/brand-mock-c.jpg" alt="시안 C"/><figcaption>C · Soft tonal</figcaption></figure>
    </div>
  </section>

  ${sample3OgPreviewHtml({
    ogSrc: "./og.jpg",
    title: LEXI1_PRODUCT.title,
  })}

  <section class="pad">
    <p class="section-kicker">WHY LEXI</p>
    <h2 class="section-title">세 가지로 정리한 포인트</h2>
    <ul class="usps">${uspHtml}</ul>
  </section>

  <section class="pad story" style="padding-top:8px">
    <p class="section-kicker">STORY</p>
    <h2 class="section-title">LEXI가 고른 오늘의 티</h2>
    ${storyHtml}
  </section>

  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">STYLING</p>
    <h2 class="section-title">스타일링 노트</h2>
    <ul class="styling">${styleHtml}</ul>
  </section>

  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>LEXI</td></tr>
      <tr><th>Product</th><td>${esc(LEXI1_PRODUCT.title)}</td></tr>
      <tr><th>Fit</th><td>기본핏 · 라운드넥 · 반팔</td></tr>
      <tr><th>Color</th><td>BLACK · 핑크 하트 자수</td></tr>
      <tr><th>Season</th><td>여름 데일리</td></tr>
      <tr><th>Ruleset</th><td>${esc(LEXI1_ID)} v1.5</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI</strong>는 과장 없는 에디토리얼로 데일리 룩을 큐레이션합니다. 작은 하트 하나가 옷장의 표정을 바꿉니다.</div>
  </section>

  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${faqHtml}
  </section>

  <section class="cta-band">
    <a class="cta" href="#cart">LEXI 장바구니 담기</a>
    <p class="cta-sub">LEXI Curated · Free shipping info at checkout</p>
  </section>
</article>
<p class="foot">© LEXI · Ruleset ${esc(LEXI1_ID)} · Editorial commerce sample</p>
</body>
</html>`;

  writeFileSync(join(OUT, "index.html"), html, "utf8");
  // Deploy mirror under public/sample3
  const pub = join(process.cwd(), "public", "sample3");
  mkdirSync(join(pub, "assets"), { recursive: true });
  mkdirSync(join(pub, "mockups"), { recursive: true });
  const pubHtml = html
    .replaceAll("./assets/", "/sample3/assets/")
    .replaceAll("./mockups/", "/sample3/mockups/")
    .replaceAll("./og.jpg", "/sample3/og.jpg?v=2");
  writeFileSync(join(pub, "index.html"), pubHtml, "utf8");
  if (!existsSync(join(pub, "og.jpg"))) {
    console.warn("WARN: public/sample3/og.jpg missing — run npx tsx scripts/generate-lexi-og.ts");
  }
  for (const a of assets) {
    copyFileSync(join(OUT, "assets", a.dest), join(pub, "assets", a.dest));
  }
  const brandJpg = join(pub, "assets", "s1-hero-brand.jpg");
  if (existsSync(brandJpg)) {
    // keep selected brand hero already in public
  }
  console.log("WROTE", join(OUT, "index.html"));
  console.log("WROTE", join(pub, "index.html"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
