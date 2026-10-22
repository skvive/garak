#!/usr/bin/env npx tsx
/**
 * SAMPLE3 여성패션 3개 PDP 생성
 * 각 상품: SAMPLE3 에디토리얼 풀페이지 HTML + sharp WebP 이미지
 * 출력: public/sample3-{slug}/
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", ".env.local") });
loadEnv({ path: join(__dirname, "..", ".env") });

// ============================================================
// 3개 상품 정의 (여성패션)
// ============================================================
const PRODUCTS = [
  {
    slug: "wc-floral-dress",
    name: "Floral Print Chiffon Midi Dress",
    brand: "SeoulLine",
    category: "여성의류 · 원피스",
    price: 42.99,
    image:
      "https://images.unsplash.com/photo-1612336307429-8a898d10e223?auto=format&fit=crop&w=900&q=80",
    copy: {
      eyebrow: "LEXI CURATED · SPRING EDIT",
      subtitle: "바람이 스치는 순간, 꽃이 피다",
      lead: "화려하지 않아 오래 기억되는 플로럴 미디 드레스. 쉬폰이 살랑일 때마다 실루엣이 살아납니다.",
      story: [
        "LEXI Floral Print Chiffon Midi Dress는 시즌을 가르지 않는 플로럴 패턴과 부드러운 쉬폰 감이 만나 우아한 데일리룩을 완성합니다. 과장된 실루엣 없이 자연스러운 A라인이 체형을 편안하게 감싸줍니다.",
        "봄에서 초가을까지 긴 시즌 동안 레이어드하기 좋은 아이템. 데일리 오피스룩부터 주말 브런치, 야외 페스티벌까지 폭넓게 활용할 수 있습니다.",
      ],
      usps: [
        { t: "시즌을 초월한 플로럴 패턴", d: "화사하지만 자극 없는 감각으로 어디에나 어울립니다." },
        { t: "부드러운 쉬폰 감", d: "가볍고 신축성 있는 소재가 바람에 우아하게 흩날립니다." },
        { t: "A라인 미디 실루엣", d: "체형을 편안하게 감싸는 자연스러운 핏." },
      ],
      styling: [
        "크림색 블레이저 + 스트랩 샌들 — 오피스 캐주얼",
        "청키 니트 가디건 + 스니커즈 — 주말 레이어드",
        "골드 액세서리 + 미니 숄더백 — 저녁 자리",
      ],
      faq: [
        { q: "사이즈 선택 팁이 있나요?", a: "A라인 실루엣으로 정사이즈를 권장합니다. 평소 착용하시는 사이즈를 선택하세요. 허리 부분이 살짝 여유 있게 떨어집니다." },
        { q: "소재 관리법은?", a: "드라이클리닝을 권장합니다. 손세탁 시 찬물에 중성세제로 부드럽게 세탁하고, 직사광선을 피해 그늘에서 건조하세요." },
        { q: "배송·반품 안내", a: "LEXI는 모든 상품을 해외 공급처에서 직소싱합니다. 배송 및 반품 정책은 주문 단계에서 상세 안내됩니다." },
      ],
    },
  },
  {
    slug: "wc-silk-blouse",
    name: "Satin Button-Up Blouse",
    brand: "DAILYSEOUL",
    category: "여성의류 · 블라우스",
    price: 38.9,
    image:
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=900&q=80",
    copy: {
      eyebrow: "LEXI CURATED · SATIN EDIT",
      subtitle: "빛을 머금은 새틴, 우아함의 다른 이름",
      lead: "매끄러운 광택이 감도는 새틴 블라우스. 단추 하나까지 신경 쓴 디테일이 LEXI의 기준입니다.",
      story: [
        "LEXI Satin Button-Up Blouse는 은은한 광택의 새틴 소재로 고급스러운 무드를 연출합니다. 깔끔한 버튼 배열과 정돈된 카라 디자인이 클래식하면서도 세련된 인상을 줍니다.",
        "오피스 룩의 정석부터 캐주얼 데님 매칭까지, 새틴의 광택이 더해질 때 매일의 옷차림이 한 단계 업그레이드됩니다. LEXI가 엄선한 쉬어 실크 감촉을 경험해보세요.",
      ],
      usps: [
        { t: "은은한 광택의 새틴 소재", d: "고급스럽지만 과하지 않은 자연스러운 광택감." },
        { t: "클래식 버튼업 디자인", d: "정돈된 카라와 정교한 단추 배열이 완성하는 클래식한 무드." },
        { t: "데님부터 테일러드까지 매칭", d: "캐주얼과 포멀을 넘나드는 활용도 높은 아이템." },
      ],
      styling: [
        "와이드 데님 + 화이트 스니커즈 — 캐주얼 새틴",
        "테일러드 팬츠 + 블레이저 — 오피스 룩",
        "미디 스커트 + 로퍼 — 데이트 룩",
      ],
      faq: [
        { q: "비침이 있나요?", a: "새틴 원단의 특성상 약간의 비침이 있을 수 있습니다. 속옷과 레이어드하거나 누드 톤 이너 착용을 권장합니다." },
        { q: "세탁 방법은?", a: "드라이클리닝을 권장합니다. 물세탁 시 광택이 손상될 수 있습니다. 다림질은 저온에서 안감 방향으로 해주세요." },
        { q: "교환·반품 기준은?", a: "LEXI의 모든 상품은 하자가 아닌 단순 변심 시에도 일정 기간 내 교환·반품이 가능합니다. 자세한 조건은 주문 페이지에서 확인하세요." },
      ],
    },
  },
  {
    slug: "wc-knit-sweater",
    name: "Chunky Knit Pullover Sweater",
    brand: "ATELIER 9",
    category: "여성의류 · 니트",
    price: 52.0,
    image:
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=900&q=80",
    copy: {
      eyebrow: "LEXI CURATED · KNIT EDIT",
      subtitle: "두툼한 매력, 가벼운 착용감",
      lead: "청키 니트의 볼륨감과 부드러운 촉감이 만나 완성하는 겨울의 클래식.",
      story: [
        "LEXI Chunky Knit Pullover Sweater는 두툼한 짜임이 주는 아늑한 실루엣이 매력적인秋冬 아이템입니다. 오버사이즈 핏이 레이어드에 최적화되어 있어 다양한 스타일링이 가능합니다.",
        "울 블렌드 소재가 보온성과 부드러운 촉감을 모두 잡았습니다. 넉넉한 품과 리브 마감이 완성하는 실루엣은 캐주얼하면서도 정돈된 인상을 줍니다.",
      ],
      usps: [
        { t: "두툼한 청키 니트 짜임", d: "볼륨감 있는 실루엣이 주는 아늑하고 스타일리시한 무드." },
        { t: "오버사이즈 레이어드 핏", d: "넉넉한 품으로 안에 셔츠·티셔츠 레이어링이 자유롭습니다." },
        { t: "울 블렌드 보온 소재", d: "따뜻하면서도 부드러운 착용감으로 겨울철 데일리로." },
      ],
      styling: [
        "와이드 코듀로이 팬츠 + 더비 슈즈 —秋冬 캐주얼",
        "미니 스커트 + 롱부츠 — 페미닌 레이어드",
        "슬림 청바지 + 스니커즈 — 데일리 룩",
      ],
      faq: [
        { q: "보풀이 생기나요?", a: "울 블렌드 소재의 특성상 사용 시 약간의 보풀이 생길 수 있습니다. 보풀 제거기로 관리하시면 오래도록 깨끗하게 착용하실 수 있습니다." },
        { q: "세탁 방법은?", a: "드라이클리닝을 권장합니다. 손세탁 시 찬물에 중성세제로 살짝 주물러 세탁하고, 형태를 잡아 그늘에서 건조하세요." },
        { q: "사이즈감은 어떻게 되나요?", a: "오버사이즈 핏으로 평소보다 한 사이즈 작게 선택해도 여유 있는 실루엣이 연출됩니다. 오버핏을 원하신다면 정사이즈를 권장합니다." },
      ],
    },
  },
];

// ============================================================
// SAMPLE3 스타일 토큰
// ============================================================
const TOKENS = {
  paper: "#faf9f7",
  ink: "#1a1a1a",
  accent: "#e85d4c",
  fog: "#6e6e73",
  line: "#e8e4dc",
  cream: "#ebe6dc",
  radius: "14px",
};

// ============================================================
// sharp 이미지 최적화
// ============================================================
const IMG_SPEC = { hero: { w: 960, h: 1200, q: 78 }, macro: { w: 720, h: 720, q: 78 } };

async function downloadAndOptimize(
  url: string,
  spec: { w: number; h: number; q: number },
  outDir: string,
  fileName: string,
): Promise<{ path: string; bytes: number }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`fetch ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf)
    .rotate()
    .resize(spec.w, spec.h, { fit: "inside", withoutEnlargement: false })
    .webp({ quality: spec.q, alphaQuality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const outPath = join(outDir, fileName);
  writeFileSync(outPath, data);
  const kb = (info.size / 1024).toFixed(1);
  console.log(`  ✓ ${fileName}: ${info.width}×${info.height} · ${kb}KB (`);
  return { path: `/${outPath.split("public")[1]!.replace(/\\/g, "/")}`, bytes: info.size };
}

// ============================================================
// HTML 빌더 (SAMPLE3 에디토리얼 스타일)
// ============================================================
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildS3Css(): string {
  return `
:root{word-break:keep-all;--paper:${TOKENS.paper};--ink:${TOKENS.ink};--fog:${TOKENS.fog};--line:${TOKENS.line};--accent:${TOKENS.accent};--cream:${TOKENS.cream}}
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
.faq summary{font-weight:700;cursor:pointer;font-size:14px}.faq p{margin:10px 0 0;color:var(--fog);font-size:13px;line-height:1.65}
.brand-note{margin-top:18px;padding:16px;border-left:3px solid var(--accent);background:#fff;font-size:13px;line-height:1.65}
.cta-band{padding:32px 24px 40px;text-align:center;background:linear-gradient(180deg,#faf9f7 0%,#f3efe6 100%)}
.cta{display:inline-block;background:var(--accent);color:#fff;font-weight:800;padding:15px 42px;border-radius:14px;font-size:15px;transition:opacity .2s}.cta:hover{opacity:.85}
.cta-sub{margin-top:12px;font-size:12px;color:var(--fog)}
.og-card{margin:0;max-width:720px;margin-inline:auto}
.og-card img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--line);aspect-ratio:1200/630;object-fit:cover;background:#fff}
.og-card figcaption{margin-top:10px;font-size:12px;color:var(--fog);line-height:1.6}
.foot{max-width:760px;margin:0 auto 40px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
`.trim();
}

function buildProductHtml(
  p: (typeof PRODUCTS)[number],
  heroPath: string,
  macroPath: string,
  ogPath: string,
): string {
  const u = (rel: string) => rel;
  const uspHtml = p.copy.usps
    .map((u) => `<li class="usp"><strong>${esc(u.t)}</strong><span>${esc(u.d)}</span></li>`)
    .join("");
  const styleHtml = p.copy.styling.map((s) => `<li>${esc(s)}</li>`).join("");
  const faqHtml = p.copy.faq
    .map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join("");
  const storyHtml = p.copy.story.map((s) => `<p>${esc(s)}</p>`).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(p.name)} · LEXI</title>
<meta name="description" content="${esc(p.copy.subtitle)} · LEXI Curated"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${esc(p.name)}"/>
<meta property="og:description" content="${esc(p.copy.subtitle)} · LEXI Curated"/>
<meta property="og:image" content="${u(ogPath)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${u(ogPath)}"/>
<style>${buildS3Css()}</style>
</head>
<body>
<header class="top">
  <div class="logo">LEXI<span>.</span></div>
  <div class="nav"><span>여성의류</span><span class="chip">SAMPLE3</span></div>
</header>
<article class="wrap">
  <div class="brand-strip">
    <div><strong>LEXI</strong> · ${esc(p.copy.subtitle)}</div>
    <div>Curated by LEXI · ${esc(p.brand)}</div>
  </div>

  <section class="hero">
    <img src="${u(heroPath)}" alt="${esc(p.name)}" loading="eager" />
    <div class="hero-copy">
      <div class="eyebrow">${esc(p.copy.eyebrow)}</div>
      <h1>${esc(p.name)}</h1>
      <p class="sub">${esc(p.copy.subtitle)}</p>
      <p class="lead">${esc(p.copy.lead)}</p>
      <div class="price-row">
        <div class="price">$${p.price.toFixed(1)}</div>
        <div class="meta">${esc(p.category)}</div>
      </div>
    </div>
  </section>

  <div class="gallery">
    <figure class="tall"><img src="${u(heroPath)}" alt="${esc(p.name)}"/><figcaption>LEXI Hero</figcaption></figure>
    <figure><img src="${u(macroPath)}" alt="Detail"/><figcaption>Detail</figcaption></figure>
    <figure><img src="${u(heroPath)}" alt="Desire"/><figcaption>Desire</figcaption></figure>
  </div>

  <!-- BRAND MARK -->
  <section class="pad">
    <p class="section-kicker">BRAND MARK</p>
    <h2 class="section-title">LEXI가 큐레이션한 아이템</h2>
    <p style="font-size:13px;color:var(--fog);line-height:1.65">${esc(p.brand)}의 감각을 LEXI 에디터가 엄선했습니다. 과장 없는 디자인과 정직한 가격으로 데일리 옷장을 완성합니다.</p>
  </section>

  <!-- OG -->
  <section class="pad">
    <p class="section-kicker">SHARE · OG</p>
    <h2 class="section-title">LEXI OG 이미지</h2>
    <figure class="og-card">
      <img src="${u(ogPath)}" alt="${esc(p.name)} OG" width="1200" height="630"/>
      <figcaption>SNS·메신저 공유 시 보이는 LEXI OG 카드 (1200×630). 게시 시 og:image 메타와 동일 자산.</figcaption>
    </figure>
  </section>

  <!-- USP -->
  <section class="pad">
    <p class="section-kicker">WHY LEXI</p>
    <h2 class="section-title">세 가지로 정리한 포인트</h2>
    <ul class="usps">${uspHtml}</ul>
  </section>

  <!-- STORY -->
  <section class="pad story" style="padding-top:8px">
    <p class="section-kicker">STORY</p>
    <h2 class="section-title">LEXI가 고른 오늘의 아이템</h2>
    ${storyHtml}
  </section>

  <!-- STYLING -->
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">STYLING</p>
    <h2 class="section-title">스타일링 노트</h2>
    <ul class="styling">${styleHtml}</ul>
  </section>

  <!-- SPEC -->
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>${esc(p.brand)}</td></tr>
      <tr><th>Product</th><td>${esc(p.name)}</td></tr>
      <tr><th>Category</th><td>${esc(p.category)}</td></tr>
      <tr><th>Fit</th><td>정사이즈 · 레귤러 핏</td></tr>
      <tr><th>Ruleset</th><td>SAMPLE3 · LEXI Editorial</td></tr>
    </table>
    <div class="brand-note"><strong>LEXI</strong>는 과장 없는 에디토리얼로 데일리 룩을 큐레이션합니다. ${esc(p.brand)}의 감각을 LEXI에서 만나보세요.</div>
  </section>

  <!-- FAQ -->
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">FAQ</p>
    <h2 class="section-title">구매 전 확인</h2>
    ${faqHtml}
  </section>

  <!-- CTA -->
  <section class="cta-band">
    <a class="cta" href="#cart">LEXI 장바구니 담기</a>
    <p class="cta-sub">LEXI Curated · 관세 포함가 표시</p>
  </section>
</article>
<p class="foot">© LEXI · Ruleset SAMPLE3 · Editorial commerce</p>
</body>
</html>`;
}

function buildIndexHtml(pages: { slug: string; name: string; brand: string; image: string; price: number }[]): string {
  const cards = pages
    .map(
      (p) => `
    <a href="./${p.slug}/" class="card">
      <img src="./${p.slug}/hero.webp" alt="${esc(p.name)}" loading="lazy"/>
      <div class="card-body">
        <p class="card-brand">${esc(p.brand)}</p>
        <h3>${esc(p.name)}</h3>
        <p class="card-price">$${p.price.toFixed(1)}</p>
        <span class="card-badge">SAMPLE3</span>
      </div>
    </a>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SAMPLE3 · 여성패션 3선 | LEXI</title>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1{text-wrap:balance;letter-spacing:0}
.logo-wrap{max-width:760px;margin:0 auto;padding:28px 20px 0}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}
h1{font-size:22px;margin:8px 0 4px;font-weight:800}
.desc{color:var(--fog);font-size:13px;margin:0 0 32px}
.grid{max-width:760px;margin:0 auto;padding:0 20px 56px;display:grid;gap:20px;grid-template-columns:1fr}
@media(min-width:640px){.grid{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--paper);border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);text-decoration:none;color:var(--ink);display:block;transition:transform .2s}
.card:hover{transform:translateY(-4px)}
.card img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:var(--line)}
.card-body{padding:14px}
.card-brand{font-size:11px;color:var(--fog);font-weight:600;margin:0 0 4px}
.card-body h3{font-size:14px;margin:0 0 4px;font-weight:700;line-height:1.4}
.card-price{font-size:17px;font-weight:800;margin:0;color:var(--ink)}
.card-badge{display:inline-block;margin-top:8px;padding:3px 8px;border:1px solid var(--accent);border-radius:999px;font-size:10px;font-weight:700;color:var(--accent)}
.foot{max-width:760px;margin:0 auto 32px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
</style>
</head>
<body>
<div class="logo-wrap">
  <div class="logo">LEXI<span>.</span></div>
  <h1>SAMPLE3 · 여성패션 3선</h1>
  <p class="desc">LEXI 에디토리얼 상품페이지 스타일로 준비한 3가지 여성의류 아이템</p>
</div>
<div class="grid">${cards}</div>
<p class="foot">© LEXI · SAMPLE3 Editorial Style</p>
</body>
</html>`;
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const base = join(process.cwd(), "public", "sample3-womens");
  mkdirSync(base, { recursive: true });
  console.log(`\n=== SAMPLE3 여성패션 3개 PDP 생성 ===`);
  console.log(`출력: /sample3-womens/`);

  for (const product of PRODUCTS) {
    const outDir = join(base, product.slug);
    mkdirSync(outDir, { recursive: true });

    console.log(`\n--- ${product.name} (${product.slug}) ---`);

    // 이미지 다운로드 + WebP 최적화
    let heroPath: string, macroPath: string, ogPath: string;
    try {
      const hero = await downloadAndOptimize(product.image, IMG_SPEC.hero, outDir, "hero.webp");
      heroPath = hero.path;
      const macro = await downloadAndOptimize(product.image, IMG_SPEC.macro, outDir, "macro.webp");
      macroPath = macro.path;
      // OG: 1200×630
      const og = await downloadAndOptimize(
        product.image,
        { w: 1200, h: 630, q: 80 },
        outDir,
        "og.webp",
      );
      ogPath = og.path;
    } catch (e) {
      console.error(`  ✗ 이미지 다운로드 실패: ${(e as Error).message}`);
      // 폴백: 상대 URL로 그냥 계속 (이미지 깨짐)
      heroPath = `./${product.slug}/hero.webp`;
      macroPath = `./${product.slug}/macro.webp`;
      ogPath = `./${product.slug}/og.webp`;
    }

    // HTML 생성
    const html = buildProductHtml(product, "hero.webp", "macro.webp", "og.webp");
    writeFileSync(join(outDir, "index.html"), html, "utf8");
    console.log(`  ✓ index.html`);
  }

  // 인덱스 페이지
  const indexHtml = buildIndexHtml(
    PRODUCTS.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      image: p.image,
      price: p.price,
    })),
  );
  writeFileSync(join(base, "index.html"), indexHtml, "utf8");
  console.log(`\n=== 완료 ===`);
  console.log(`인덱스: http://localhost:3000/sample3-womens/`);
  console.log(`상품페이지 예: http://localhost:3000/sample3-womens/wc-floral-dress/`);
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});