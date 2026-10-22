/**
 * 카드뉴스 생성 (M10) — ah-my-marketing amm-cardnews.md 이식.
 * 7슬라이드 아크(훅→문제→현상→해결/VP→근거→디테일→CTA) → 슬라이드별 HTML.
 * 바이너리 렌더(HTML→PNG)는 렌더 서비스(services/) 담당. 앱은 저작 레이어(HTML) 생성.
 * 디자인 원칙(creative-design.md): 그라디언트·글로우·섀도우 금지, 타이포+여백 위계.
 * 폰트: 오픈 한글 시스템 스택(Pretendard/Apple SD Gothic/Noto) — 외부 에셋 의존 0.
 */
const FONT = `'Pretendard','Pretendard Variable','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif`;

export type CardNewsSeed = {
  hook: string;
  painPoint: string;
  benefit: string;
  category: string;
  evidence: string; // 근거 한 줄
  detail: string; // 디테일 한 줄
  cta: string;
  heroImage?: string;
  brand?: string;
};

export type CardNewsRatio = "1:1" | "4:5" | "9:16";
const SIZE: Record<CardNewsRatio, [number, number]> = {
  "1:1": [1080, 1080],
  "4:5": [1080, 1350],
  "9:16": [1080, 1920],
};

type Slide = { role: string; kicker: string; title: string; body?: string };

function slides(s: CardNewsSeed): Slide[] {
  return [
    { role: "hook", kicker: "01", title: s.hook, body: "" },
    { role: "problem", kicker: "02", title: `${s.painPoint}`, body: "이런 경험, 익숙하지 않나요?" },
    { role: "status", kicker: "03", title: `보통 ${s.category}는 이렇습니다`, body: "그래서 매번 아쉬웠죠." },
    { role: "solution", kicker: "04", title: s.benefit, body: "LEXI가 정품으로 큐레이션했습니다." },
    { role: "evidence", kicker: "05", title: s.evidence, body: "" },
    { role: "detail", kicker: "06", title: s.detail, body: "" },
    { role: "cta", kicker: "07", title: s.cta, body: s.brand ?? "LEXI" },
  ];
}

function slideHtml(sl: Slide, [w, h]: [number, number], hero?: string): string {
  const isCta = sl.role === "cta";
  const isHook = sl.role === "hook";
  const bg = isCta ? "#111114" : "#ffffff";
  const fg = isCta ? "#ffffff" : "#111114";
  const accent = "#FF5C4D";
  const heroBlock =
    isHook && hero
      ? `<div style="width:100%;flex:1;min-height:0;background:#f4f4f2;border-radius:24px;overflow:hidden;display:flex;align-items:center;justify-content:center">
           <img src="${hero}" alt="" style="width:100%;height:100%;object-fit:cover"/>
         </div>`
      : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}
.slide{width:${w}px;height:${h}px;background:${bg};color:${fg};font-family:${FONT};
  display:flex;flex-direction:column;justify-content:${isHook ? "space-between" : "center"};
  gap:32px;padding:96px 88px}
.kicker{font-size:34px;font-weight:800;letter-spacing:4px;color:${accent}}
.title{font-size:${isHook ? 84 : 68}px;font-weight:800;line-height:1.15;letter-spacing:-1px}
.body{font-size:40px;font-weight:500;color:${isCta ? "#c9a05c" : "#6e6e73"};line-height:1.4}
.brandmark{font-size:44px;font-weight:800}</style></head>
<body><div class="slide">
  <div class="kicker">${esc(sl.kicker)}</div>
  ${heroBlock}
  <div class="title">${esc(sl.title)}</div>
  ${sl.body ? `<div class="body">${esc(sl.body)}</div>` : ""}
  ${isCta ? `<div class="brandmark">${esc(sl.body ?? "LEXI")}<span style="color:${accent}">.</span></div>` : ""}
</div></body></html>`;
}

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function generateCardNews(seed: CardNewsSeed, ratio: CardNewsRatio = "4:5") {
  const dims = SIZE[ratio];
  const sl = slides(seed);
  const html = sl.map((s, i) => ({
    index: i,
    role: s.role,
    title: s.title,
    html: slideHtml(s, dims, i === 0 ? seed.heroImage : undefined),
  }));
  // 콘솔 미리보기용: 슬라이드를 가로 스크롤로 이어붙인 단일 HTML
  const previewHtml = `<!doctype html><html><head><meta charset="utf-8"/>
<style>body{margin:0;background:#e4e4e0;display:flex;gap:16px;padding:16px;overflow-x:auto;font-family:${FONT}}
.card{flex:0 0 auto;transform-origin:top left;transform:scale(0.24);width:${dims[0]}px;height:${dims[1]}px}
.wrap{flex:0 0 ${Math.round(dims[0] * 0.24)}px;height:${Math.round(dims[1] * 0.24)}px}</style></head>
<body>${sl
    .map((s, i) => `<div class="wrap"><iframe class="card" style="border:0" srcdoc="${esc(slideHtml(s, dims, i === 0 ? seed.heroImage : undefined))}"></iframe></div>`)
    .join("")}</body></html>`;
  return { ratio, dims, slides: html, previewHtml };
}
