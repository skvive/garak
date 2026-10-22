#!/usr/bin/env npx tsx
/**
 * SAMPLE3 + AMBA 여성패션 PDP 재빌드
 *
 * - 기존 mock PDP의 Amba 착용샷 이미지(S1/S2/S3) 사용
 * - SKILL.md/linkr-build-standards 정식 블록 순서 준수
 * - AMBA 모델 프로필 블록
 * - EN on-image / locale body / EN OG bake
 * - titleMarketing(H1) + titleInternal(DETAILS)
 * - RPCOW brand-note
 * - pricing은 판매가 공식 (cost+20)*1.3 → x.9
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { join, basename } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: join(process.cwd(), ".env.local") });
loadEnv({ path: join(process.cwd(), ".env") });

// ============================================================
// Amba 캐스트 인덱스
// ============================================================
interface Cast {
  id: string; name: string; gender: string; nationality: string;
  interests: string[]; agency: "AMBA"; agencyFull: "AI Ambassador";
  faceSeed: string; folder: string; source: { style?: string; sex?: string };
}

function loadCasts(): Cast[] {
  try {
    const idx = JSON.parse(readFileSync(join(process.cwd(), "public", "casts", "amba", "index.json"), "utf8"));
    return (idx.casts || []) as Cast[];
  } catch { return []; }
}

function pickCast(gender: "F" | "M", stylePref: string[]): Cast | null {
  const all = loadCasts().filter(c => c.source?.sex === gender);
  if (!all.length) return null;
  // style 우선순위 매칭
  const ranked = all
    .map(c => ({ c, idx: stylePref.indexOf(c.source?.style || "") }))
    .sort((a, b) => (a.idx === -1 ? 999 : a.idx) - (b.idx === -1 ? 999 : b.idx));
  return ranked[0]?.c ?? all[0] ?? null;
}

// ============================================================
// 3개 상품 정의 (기존 mock PDP 자산 바인딩)
// ============================================================
interface ProdDef {
  slug: string;
  mockDir: string;         // public/sample3/mock-*
  titleMarketing: string;  // 한글 H1
  titleInternal: string;   // CJ 원제
  brand: string;
  categoryKo: string;
  costUsd: number;
  sellUsd: number;
  copy: {
    eyebrow: string;
    subtitle: string;
    lead: string;
    story: string[];
    usps: { t: string; d: string }[];
    styling: string[];
    faq: { q: string; a: string }[];
  };
  stylePref: string[];     // Amba style priority
}

const PRODUCTS: ProdDef[] = [
  {
    slug: "wc-floral-dress",
    mockDir: "mock-floral-print-chiffon-midi-dress-al-dress",
    titleMarketing: "시폰 플라워 미디 원피스",
    titleInternal: "Floral Print Chiffon Midi Dress",
    brand: "SeoulLine",
    categoryKo: "여성의류 · 원피스",
    costUsd: 42.99,
    sellUsd: 81.9,
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
        { q: "반품·교환 정책은?", a: "제품 하자가 아닌 단순 변심 반품 시 왕복 국제 배송비 및 관부과세는 구매자 부담입니다. 미사용·택 유지 시 안내된 기간 내 반품이 가능합니다." },
      ],
    },
    stylePref: ["FML", "HIG", "STU"],
  },
  {
    slug: "wc-silk-blouse",
    mockDir: "mock-satin-button-up-blouse-k-blouse",
    titleMarketing: "새틴 버튼업 블라우스",
    titleInternal: "Satin Button-Up Blouse",
    brand: "DAILYSEOUL",
    categoryKo: "여성의류 · 블라우스",
    costUsd: 38.9,
    sellUsd: 76.9,
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
    stylePref: ["STU", "FML", "HIG"],
  },
  {
    slug: "wc-knit-sweater",
    mockDir: "mock-chunky-knit-pullover-sweater--sweater",
    titleMarketing: "청키 니트 풀오버 스웨터",
    titleInternal: "Chunky Knit Pullover Sweater",
    brand: "ATELIER 9",
    categoryKo: "여성의류 · 니트",
    costUsd: 52,
    sellUsd: 93.9,
    copy: {
      eyebrow: "LEXI CURATED · KNIT EDIT",
      subtitle: "두툼한 매력, 가벼운 착용감",
      lead: "청키 니트의 볼륨감과 부드러운 촉감이 만나 완성하는 겨울의 클래식.",
      story: [
        "LEXI Chunky Knit Pullover Sweater는 두툼한 짜임이 주는 아늑한 실루엣이 매력적인 아이템입니다. 오버사이즈 핏이 레이어드에 최적화되어 있어 다양한 스타일링이 가능합니다.",
        "울 블렌드 소재가 보온성과 부드러운 촉감을 모두 잡았습니다. 넉넉한 품과 리브 마감이 완성하는 실루엣은 캐주얼하면서도 정돈된 인상을 줍니다.",
      ],
      usps: [
        { t: "두툼한 청키 니트 짜임", d: "볼륨감 있는 실루엣이 주는 아늑하고 스타일리시한 무드." },
        { t: "오버사이즈 레이어드 핏", d: "넉넉한 품으로 안에 셔츠·티셔츠 레이어링이 자유롭습니다." },
        { t: "울 블렌드 보온 소재", d: "따뜻하면서도 부드러운 착용감으로 겨울철 데일리로." },
      ],
      styling: [
        "와이드 코듀로이 팬츠 + 더비 슈즈 — 가을·겨울 캐주얼",
        "미니 스커트 + 롱부츠 — 페미닌 레이어드",
        "슬림 청바지 + 스니커즈 — 데일리 룩",
      ],
      faq: [
        { q: "보풀이 생기나요?", a: "울 블렌드 소재의 특성상 사용 시 약간의 보풀이 생길 수 있습니다. 보풀 제거기로 관리하시면 오래도록 깨끗하게 착용하실 수 있습니다." },
        { q: "세탁 방법은?", a: "드라이클리닝을 권장합니다. 손세탁 시 찬물에 중성세제로 살짝 주물러 세탁하고, 형태를 잡아 그늘에서 건조하세요." },
        { q: "사이즈감은 어떻게 되나요?", a: "오버사이즈 핏으로 평소보다 한 사이즈 작게 선택해도 여유 있는 실루엣이 연출됩니다. 오버핏을 원하신다면 정사이즈를 권장합니다." },
      ],
    },
    stylePref: ["STR", "OUT", "STU"],
  },
];

// ============================================================
// SAMPLE3 CSS (풀 세트)
// ============================================================
function buildCss(): string {
  return `
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
.faq{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 10px;background:#fff}.faq summary{font-weight:700;cursor:pointer;font-size:14px}.faq p{margin:10px 0 0;color:var(--fog);font-size:13px;line-height:1.65}
.brand-note{margin-top:18px;padding:16px;border-left:3px solid var(--accent);background:#fff;font-size:13px;line-height:1.65}
.cta-band{padding:32px 24px 40px;text-align:center;background:linear-gradient(180deg,#faf9f7 0%,#f3efe6 100%)}
.cta{display:inline-block;background:var(--accent);color:#fff;font-weight:800;padding:15px 42px;border-radius:14px;font-size:15px;transition:opacity .2s}.cta:hover{opacity:.85}
.cta-sub{margin-top:12px;font-size:12px;color:var(--fog)}
.model-card{padding:18px 16px;border:1px solid var(--line);border-radius:14px;background:#fff;font-size:13px;line-height:1.65;color:var(--fog)}.model-card strong{color:var(--ink)}
.model-profile{display:grid;gap:10px;margin:0;padding:0;list-style:none}.model-profile li{display:grid;grid-template-columns:88px 1fr;gap:10px;align-items:baseline}
.model-profile .k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--fog);font-weight:700}.model-profile .v{color:var(--ink);font-size:14px}
.model-agency{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--fog)}.model-agency b{color:var(--ink)}
.brand-mark-card{margin:0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.brand-mark-card figure{margin:0}.brand-mark-card img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:14px;background:var(--line)}.brand-mark-card figcaption{font-size:11px;text-align:center;margin-top:6px;color:var(--fog)}
.og-card{margin:0}.og-card img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--line);aspect-ratio:1200/630;object-fit:cover;background:#fff}
.og-card figcaption{margin-top:10px;font-size:12px;color:var(--fog);line-height:1.6}
.foot{max-width:760px;margin:0 auto 40px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
`.trim();
}

// ============================================================
// HTML 빌더
// ============================================================
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildPdpHtml(p: ProdDef, cast: Cast, assets: { hero: string; macro: string; desire: string; og: string }): string {
  const base = ".";
  const hi = `${base}/assets/${assets.hero}`;
  const mi = `${base}/assets/${assets.macro}`;
  const di = `${base}/assets/${assets.desire}`;
  const oi = `${base}/${assets.og}`;
  const sell = p.sellUsd;
  const interestStr = (cast.interests || []).join(" · ");

  const uspHtml = p.copy.usps.map(u => `<li class="usp"><strong>${esc(u.t)}</strong><span>${esc(u.d)}</span></li>`).join("");
  const storyHtml = p.copy.story.map(s => `<p>${esc(s)}</p>`).join("");
  const styleHtml = p.copy.styling.map(s => `<li>${esc(s)}</li>`).join("");
  const faqHtml = p.copy.faq.map(f => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(p.titleMarketing)} · LEXI</title>
<meta name="description" content="${esc(p.copy.subtitle)} · LEXI Curated"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="LEXI"/>
<meta property="og:title" content="${esc(p.titleMarketing)}"/>
<meta property="og:description" content="${esc(p.copy.subtitle)} · LEXI Curated"/>
<meta property="og:url" content="https://lexistyle.vercel.app/product/${p.slug}"/>
<meta property="og:image" content="${oi}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${oi}"/>
<style>${buildCss()}</style>
</head>
<body>
<header class="top">
  <div class="logo">LEXI<span>.</span></div>
  <div class="nav"><span>Women's Fashion</span><span class="chip">SAMPLE3 · LEXI Curated</span></div>
</header>
<article class="wrap">
  <!-- BRAND -->
  <div class="brand-strip">
    <div><strong>LEXI</strong> · ${esc(p.copy.subtitle)}</div>
    <div>Curated by LEXI · ${esc(p.titleMarketing)}</div>
  </div>

  <!-- HERO -->
  <section class="hero">
    <img src="${hi}" alt="${esc(p.titleMarketing)} — ${esc(cast.name)} wearing" loading="eager"/>
    <div class="hero-copy">
      <div class="eyebrow">${esc(p.copy.eyebrow)}</div>
      <h1>${esc(p.titleMarketing)}</h1>
      <p class="sub">${esc(p.copy.subtitle)}</p>
      <p class="lead">${esc(p.copy.lead)}</p>
      <div class="price-row">
        <div class="price">USD ${sell.toFixed(1)}</div>
        <div class="meta">${esc(p.categoryKo)}</div>
      </div>
    </div>
  </section>

  <!-- GALLERY (3-act: Hero/Detail/Desire) -->
  <div class="gallery">
    <figure class="tall"><img src="${hi}" alt="${esc(p.titleMarketing)}"/><figcaption>${esc(p.titleMarketing)}</figcaption></figure>
    <figure><img src="${mi}" alt="detail"/><figcaption>Detail</figcaption></figure>
    <figure><img src="${di}" alt="desire"/><figcaption>Lifestyle</figcaption></figure>
  </div>

  <!-- MODEL CAST (AMBA) -->
  <section class="pad">
    <p class="section-kicker">MODEL CAST</p>
    <h2 class="section-title">이 상품의 화보 모델</h2>
    <div class="model-card">
      <ul class="model-profile">
        <li><span class="k">이름</span><span class="v">${esc(cast.name)}</span></li>
        <li><span class="k">Gender</span><span class="v">${cast.gender}</span></li>
        <li><span class="k">Nationality</span><span class="v">${cast.nationality}</span></li>
        <li><span class="k">Interests</span><span class="v">${esc(interestStr)}</span></li>
      </ul>
      <div class="model-agency">Agency <b>AMBA</b> <span style="color:var(--fog)">(AI Ambassador)</span></div>
    </div>
  </section>

  <!-- BRAND MARK (LEXI 패치 시안) -->
  <section class="pad">
    <p class="section-kicker">BRAND MARK</p>
    <h2 class="section-title">LEXI signature</h2>
    <p style="font-size:13px;color:var(--fog);line-height:1.65;margin-bottom:16px">과장 없는 LEXI 워드마크. 제품에 맞는 소형 브랜드 마크로 완성합니다.</p>
    <div class="brand-mark-card">
      <figure><img src="${hi}" alt="A"/><figcaption>Minimal</figcaption></figure>
      <figure><img src="${mi}" alt="B"/><figcaption>Stacked</figcaption></figure>
      <figure><img src="${di}" alt="C"/><figcaption>Tonal</figcaption></figure>
    </div>
  </section>

  <!-- OG -->
  <section class="pad">
    <p class="section-kicker">SHARE · OG</p>
    <h2 class="section-title">LEXI OG image</h2>
    <figure class="og-card">
      <img src="${oi}" alt="${esc(p.titleMarketing)} OG" width="1200" height="630"/>
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

  <!-- SPEC + RPCOW -->
  <section class="pad" style="padding-top:8px">
    <p class="section-kicker">DETAILS</p>
    <h2 class="section-title">제품 정보</h2>
    <table class="spec">
      <tr><th>Brand</th><td>LEXI</td></tr>
      <tr><th>Product</th><td>${esc(p.titleMarketing)}</td></tr>
      <tr><th>Internal name</th><td>${esc(p.titleInternal)}</td></tr>
      <tr><th>Category</th><td>${esc(p.categoryKo)}</td></tr>
      <tr><th>Fit</th><td>정사이즈 · 레귤러 핏</td></tr>
      <tr><th>Season</th><td>올시즌 데일리</td></tr>
    </table>
    <div class="brand-note">
      <strong>LEXI IS RPCOW.</strong><br/>
      Radiant Presence, Captivating Outfit for your Wardrobe.
    </div>
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
    <p class="cta-sub">LEXI Curated · 관세 포함가</p>
  </section>
</article>
<p class="foot">© LEXI · ${esc(p.categoryKo)} · SAMPLE3 · AMBA</p>
</body>
</html>`;
}

function buildIndexHtml(pages: { slug: string; title: string; brand: string; sell: number; mockDir: string; castName: string }[]): string {
  const cards = pages.map(p => `
    <a href="../sample3/${esc(p.mockDir)}/" class="card">
      <div class="card-img" style="background:var(--line)"><img src="../sample3/${esc(p.mockDir)}/assets/s1-hero-opt.webp" alt="${esc(p.title)}" loading="lazy"/></div>
      <div class="card-body">
        <p class="card-brand">${esc(p.brand)}</p>
        <h3>${esc(p.title)}</h3>
        <p class="card-price">USD ${p.sell.toFixed(1)}</p>
        <p class="card-cast">Model · ${esc(p.castName)} (AMBA)</p>
        <span class="card-badge">SAMPLE3</span>
      </div>
    </a>`).join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SAMPLE3 · AMBA 여성패션 | LEXI</title>
<style>
:root{word-break:keep-all;--paper:#faf9f7;--ink:#1a1a1a;--fog:#6e6e73;--line:#e8e4dc;--accent:#e85d4c;--cream:#ebe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.65}
h1{text-wrap:balance;letter-spacing:0}
.logo-wrap{max-width:820px;margin:0 auto;padding:28px 20px 0}
.logo{font-weight:800;letter-spacing:.14em;font-size:26px}.logo span{color:var(--accent)}
h1{font-size:22px;margin:8px 0 4px;font-weight:800}
.desc{color:var(--fog);font-size:13px;margin:0 0 32px}
.grid{max-width:820px;margin:0 auto;padding:0 20px 56px;display:grid;gap:20px;grid-template-columns:1fr}
@media(min-width:640px){.grid{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--paper);border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);text-decoration:none;color:var(--ink);display:block;transition:transform .2s}
.card:hover{transform:translateY(-4px)}
.card-img{width:100%;aspect-ratio:4/5;overflow:hidden}.card-img img{width:100%;height:100%;object-fit:cover;display:block}
.card-body{padding:14px}
.card-brand{font-size:11px;color:var(--fog);font-weight:600;margin:0 0 4px}
.card-body h3{font-size:14px;margin:0 0 4px;font-weight:700;line-height:1.4}
.card-price{font-size:17px;font-weight:800;margin:4px 0}
.card-cast{font-size:11px;color:var(--fog);margin:4px 0}
.card-badge{display:inline-block;margin-top:8px;padding:3px 8px;border:1px solid var(--accent);border-radius:999px;font-size:10px;font-weight:700;color:var(--accent)}
.foot{max-width:820px;margin:0 auto 32px;padding:0 20px;font-size:11px;color:var(--fog);text-align:center}
</style>
</head>
<body>
<div class="logo-wrap">
  <div class="logo">LEXI<span>.</span></div>
  <h1>SAMPLE3 · AMBA 여성패션</h1>
  <p class="desc">AMBA 모델 화보와 LEXI 에디토리얼 스타일로 준비한 3가지 여성의류 상품페이지</p>
</div>
<div class="grid">${cards}</div>
<p class="foot">© LEXI · SAMPLE3 · AMBA (AI Ambassador)</p>
</body></html>`;
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const outDir = join(process.cwd(), "public", "sample3-amba");
  mkdirSync(outDir, { recursive: true });
  const sample3Base = join(process.cwd(), "public", "sample3");

  console.log(`\n=== SAMPLE3 + AMBA 여성패션 PDP 재빌드 ===`);
  console.log(`출력: /sample3-amba/`);

  const pages: { slug: string; title: string; brand: string; sell: number; mockDir: string; castName: string }[] = [];

  for (const p of PRODUCTS) {
    const mockPath = join(sample3Base, p.mockDir);
    const assetDir = join(mockPath, "assets");
    const ogFile = join(mockPath, "og-opt.webp");

    if (!existsSync(mockPath)) {
      console.log(`\n  ✗ ${p.mockDir} 없음 — 건너뜀`);
      continue;
    }

    // 캐스트 픽
    let cast = pickCast("F", p.stylePref);
    // 기존 meta.json에서 cast 정보 읽기
    const metaPath = join(mockPath, "meta.json");
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        if (meta.modelCast?.name) {
          // meta.json의 cast 정보로 가상 객체 생성
          cast = {
            id: meta.modelCast.id || "0000",
            name: meta.modelCast.name,
            gender: meta.modelCast.gender || "여성",
            nationality: meta.modelCast.nationality || "대한민국",
            interests: meta.modelCast.interests || [],
            agency: "AMBA",
            agencyFull: "AI Ambassador",
            faceSeed: meta.modelCast.faceSeed || "",
            folder: meta.modelCast.castFolder || "",
            source: { style: "STU", sex: "F" },
          };
        }
      } catch {}
    }
    if (!cast) {
      console.log(`\n  ✗ ${p.titleMarketing} — 캐스트 없음`);
      cast = { id: "0000", name: "Unknown", gender: "여성", nationality: "대한민국", interests: ["패션"], agency: "AMBA", agencyFull: "AI Ambassador", faceSeed: "", folder: "", source: { style: "STU", sex: "F" } };
    }

    // 에셋 확인
    const hero = existsSync(join(assetDir, "s1-hero-opt.webp")) ? "s1-hero-opt.webp" : null;
    const macro = existsSync(join(assetDir, "s2-detail-opt.webp")) ? "s2-detail-opt.webp" : null;
    const desire = existsSync(join(assetDir, "s3-desire-opt.webp")) ? "s3-desire-opt.webp" : null;
    const og = existsSync(ogFile) ? "og-opt.webp" : null;

    if (!hero || !macro || !desire || !og) {
      console.log(`\n  ✗ ${p.titleMarketing} — 에셋 부족: hero=${!!hero} macro=${!!macro} desire=${!!desire} og=${!!og}`);
      continue;
    }

    // 출력 디렉토리
    const prodOut = join(outDir, p.slug);
    const prodAssets = join(prodOut, "assets");
    mkdirSync(prodAssets, { recursive: true });

    // 에셋 복사
    copyFileSync(join(assetDir, hero), join(prodAssets, hero));
    copyFileSync(join(assetDir, macro), join(prodAssets, macro));
    copyFileSync(join(assetDir, desire), join(prodAssets, desire));
    copyFileSync(ogFile, join(prodOut, og));

    // HTML 생성
    const html = buildPdpHtml(p, cast, { hero, macro, desire, og: og });
    writeFileSync(join(prodOut, "index.html"), html, "utf8");

    pages.push({ slug: p.slug, title: p.titleMarketing, brand: p.brand, sell: p.sellUsd, mockDir: p.mockDir, castName: cast.name });
    console.log(`\n  ✓ ${p.titleMarketing}`);
    console.log(`    모델: ${cast.name} (${cast.nationality} · ${cast.id})`);
    console.log(`    가격: USD ${p.sellUsd.toFixed(1)}`);
    console.log(`    페이지: /sample3-amba/${p.slug}/`);
  }

  // 인덱스
  writeFileSync(join(outDir, "index.html"), buildIndexHtml(pages), "utf8");
  console.log(`\n=== 완료 ===`);
  console.log(`인덱스: http://localhost:3000/sample3-amba/`);
  console.log(`총 ${pages.length}개 상품`);
}

main().catch(e => { console.error("FAIL", e); process.exit(1); });