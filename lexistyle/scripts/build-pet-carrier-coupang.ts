/**
 * 쿠팡 상세페이지 v1 — 확장형 소프트 펫 캐리어
 * (캐리어 1개 · 블랙/그레이/그린/오렌지 택1 · 단일 사이즈 46×28×28cm)
 * Usage: npx tsx scripts/build-pet-carrier-coupang.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "expandable-soft-pet-carrier";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/pdp-source/pet-carrier";
const PUBLIC = "public/pdp/cjmy1203793-pet-carrier";

export const TITLE = "확장형 소프트 펫 캐리어";
export const COUPANG_NAME = `LEXI ${TITLE}`;
const TITLE_INTERNAL = "Airline Soft Expandable Pet Carrier";

const COLORS = [
  { ko: "블랙", en: "BLACK", hero: "hero-black.jpg", product: "product-black.jpg", src: "black", productSrc: "product-black" },
  { ko: "그레이", en: "GREY", hero: "hero-grey.jpg", product: "product-grey.jpg", src: "grey", productSrc: "product-grey" },
  { ko: "그린", en: "GREEN", hero: "hero-green.jpg", product: "product-green.jpg", src: "green", productSrc: "product-green" },
  { ko: "오렌지", en: "ORANGE", hero: "hero-orange.jpg", product: "product-orange.jpg", src: "orange", productSrc: "product-orange" },
];

const COPY = {
  subtitle: "블랙·그레이·그린·오렌지 4가지 컬러 중 원하는 1개",
  lead: "항공·자동차 이동에 쓰기 좋은 소프트 사이드 펫 캐리어입니다. 사면 확장 메시로 공간을 넓히고, 반사 테이프로 야간 시인성을 높였습니다. 주문 시 컬러 1개를 선택해 주세요.",
  mood: "접으면 납작하게, 펼치면 펫이 움직일 여유 공간이 생깁니다. 어깨 끈·손잡이·안전 고리로 이동이 편하고, 메시 창으로 통풍이 잘 됩니다.",
  styling: [
    "자동차 좌석에 벨트로 고정하거나 어깨에 메고 이동할 때 쓰기 좋습니다.",
    "집에 도착하면 사면 지퍼를 열어 확장하면 임시 휴식 공간으로도 활용할 수 있습니다.",
    "블랙은 단정한 이동용, 그레이·그린·오렌지는 컬러 포인트로 고르기 좋습니다.",
  ],
  faq: [
    { q: "네 가지 컬러가 함께 오나요?", a: "아닙니다. 블랙·그레이·그린·오렌지는 각각 별도의 옵션입니다. 선택하신 컬러의 캐리어 1개만 배송됩니다." },
    { q: "사이즈는 어떻게 되나요?", a: "약 46×28×28cm(확장 전 본체 기준)입니다. 소형견·고양이 이동용으로 안내되어 있으며, 반려동물 체형에 맞는지는 구매 전 확인해 주세요." },
    { q: "확장이 되나요?", a: "사면 메시 지퍼를 열어 공간을 넓힐 수 있는 확장형 구조입니다. 이동 중에는 닫아 안전하게 사용해 주세요." },
    { q: "세탁은 어떻게 하나요?", a: "내부 패드는 분리해 세탁할 수 있습니다. 본체는 세탁 전 제품 라벨의 관리 방법을 확인해 주세요." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품으로 교환·반품 시 해외배송 왕복비용 48,000원이 공제됩니다. 제품 하자의 경우 절반을 판매자가 부담하여 24,000원이 공제됩니다." },
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = { file: string; src: string; crop?: Crop; w: number; h: number; webp?: string; fit?: "cover" | "contain" };

const SHOTS: Shot[] = [
  { file: "hero-black.jpg", src: "black", w: 900, h: 1200, webp: "assets/s1-hero-opt.webp" },
  { file: "hero-grey.jpg", src: "grey", w: 900, h: 1200 },
  { file: "hero-green.jpg", src: "green", w: 900, h: 1200 },
  { file: "hero-orange.jpg", src: "orange", w: 900, h: 1200 },
  { file: "look-expand.jpg", src: "look-expand", w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "product-black.jpg", src: "product-black", w: 1000, h: 1000, fit: "contain" },
  { file: "product-grey.jpg", src: "product-grey", w: 1000, h: 1000, fit: "contain" },
  { file: "product-green.jpg", src: "product-green", w: 1000, h: 1000, fit: "contain" },
  { file: "product-orange.jpg", src: "product-orange", w: 1000, h: 1000, fit: "contain" },
  { file: "og.jpg", src: "black", crop: { left: 0, top: 120, width: 768, height: 403 }, w: 1200, h: 630, webp: "og-opt.webp" },
  { file: "coupang-main.jpg", src: "black", crop: { left: 48, top: 80, width: 672, height: 672 }, w: 1000, h: 1000 },
  { file: "rep-black.jpg", src: "black", crop: { left: 48, top: 80, width: 672, height: 672 }, w: 1000, h: 1000 },
  { file: "rep-grey.jpg", src: "grey", crop: { left: 48, top: 80, width: 672, height: 672 }, w: 1000, h: 1000 },
  { file: "rep-green.jpg", src: "green", crop: { left: 48, top: 80, width: 672, height: 672 }, w: 1000, h: 1000 },
  { file: "rep-orange.jpg", src: "orange", crop: { left: 48, top: 80, width: 672, height: 672 }, w: 1000, h: 1000 },
];

async function images() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(`${DIR}/assets`, { recursive: true });
  mkdirSync(PUBLIC, { recursive: true });
  for (const s of SHOTS) {
    const meta = await sharp(`${SRC}/${s.src}.jpg`).metadata();
    let img = sharp(`${SRC}/${s.src}.jpg`);
    if (s.crop) {
      const left = Math.min(s.crop.left, Math.max(0, (meta.width ?? 0) - s.crop.width));
      const top = Math.min(s.crop.top, Math.max(0, (meta.height ?? 0) - s.crop.height));
      const width = Math.min(s.crop.width, (meta.width ?? s.crop.width) - left);
      const height = Math.min(s.crop.height, (meta.height ?? s.crop.height) - top);
      img = img.extract({ left, top, width, height });
    }
    const buf = await img
      .resize(s.w, s.h, { fit: s.fit ?? "cover", position: "centre", background: "#ffffff" })
      .toBuffer();
    await sharp(buf).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/${s.file}`);
    await sharp(buf).jpeg({ quality: 88, mozjpeg: true }).toFile(`${PUBLIC}/${s.file}`);
    if (s.webp) await sharp(buf).webp({ quality: s.w === 1200 ? 80 : 78, effort: 6 }).toFile(`${DIR}/${s.webp}`);
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const T = { ink: "#1a1a1a", paper: "#faf9f7", cream: "#ebe6dc", line: "#e8e4dc", fog: "#6e6e73", accent: "#e85d4c" };
const font = "font-family:Pretendard,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";
const img = (f: string, alt = "") => `<img src="${BASE}/${f}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;margin:0;border:0"/>`;
const kicker = (en: string) => `<p style="margin:0 0 8px;font-size:13px;color:${T.accent};font-weight:700;letter-spacing:0.14em">${en}</p>`;
const h2 = (ko: string) => `<h2 style="margin:0 0 14px;font-size:26px;line-height:1.4;font-weight:800;color:${T.ink};text-wrap:balance">${esc(ko)}</h2>`;
const lead = (ko: string) => `<p style="margin:0;font-size:16px;line-height:1.7;color:${T.fog}">${esc(ko)}</p>`;
const sec = (inner: string, bg = T.paper, pad = "56px 32px") => `<div style="background:${bg};padding:${pad}">${inner}</div>`;
const caption = (en: string) => `<p style="margin:0;padding:12px 32px 0;font-size:13px;color:${T.fog};letter-spacing:0.12em;text-align:right">${en}</p>`;

function point(no: string, title: string, desc: string, file: string, en: string) {
  return `<div style="background:${T.paper};padding:56px 32px 0">
  <p style="margin:0;font-size:56px;line-height:1;font-weight:900;color:${T.cream}">${no}</p>
  <p style="margin:6px 0 8px;font-size:13px;color:${T.accent};font-weight:700;letter-spacing:0.14em">${en}</p>
  ${h2(title)}${lead(desc)}
  <div style="margin-top:24px;border-radius:16px;overflow:hidden;background:#fff">${img(file, en)}</div>
</div>`;
}

function fragment() {
  const chip = (t: string) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid ${T.line};font-size:14px;font-weight:700;color:${T.ink}">${esc(t)}</span>`;
  const stat = (k: string, v: string, last = false) => `<td style="width:25%;padding:18px 6px;text-align:center;${last ? "" : `border-right:1px solid ${T.line}`}"><p style="margin:0 0 6px;font-size:13px;color:${T.fog}">${k}</p><p style="margin:0;font-size:17px;font-weight:800;color:${T.ink};line-height:1.4">${v}</p></td>`;
  const row = (k: string, v: string) => `<tr><th style="width:32%;text-align:left;padding:12px 10px;border-bottom:1px solid ${T.line};font-size:14px;color:${T.fog};font-weight:600;vertical-align:top">${k}</th><td style="padding:12px 10px;border-bottom:1px solid ${T.line};font-size:15px;line-height:1.6;color:${T.ink}">${esc(v)}</td></tr>`;
  const optRow = (c: (typeof COLORS)[number]) => `<tr>
    <td style="width:34%;padding:10px 10px 10px 0;vertical-align:middle"><div style="border-radius:10px;overflow:hidden">${img(c.hero, c.en)}</div></td>
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${c.ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">캐리어 1개</span></p>
    <p style="margin:0;font-size:14px;color:${T.fog}">약 46×28×28cm · 확장형 소프트 백</p></td></tr>`;
  const colorCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:25%;padding:0 ${i === 3 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img(c.hero, c.en)}</div><p style="margin:12px 0 0;font-size:15px;font-weight:800;text-align:center">${c.ko}</p></td>`;
  const designCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:25%;padding:0 ${i === 3 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img(c.product, c.en)}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">${c.ko}</p></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const look = (tag: string, text: string) => `<div style="margin:0 0 10px;padding:16px 18px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${T.accent};letter-spacing:0.12em">${tag}</p><p style="margin:0;font-size:15px;line-height:1.6;color:${T.ink}">${esc(text)}</p></div>`;

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">PET TRAVEL · CARRIER</span>
</div>
${img("hero-black.jpg", "Hero")}
${sec(`${kicker("SOFT PET CARRIER")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("4컬러 택1")}${chip("확장형")}${chip("메시 통풍")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "캐리어 1개")}${stat("컬러", "4종 택1")}${stat("사이즈", "46×28×28")}${stat("특징", "사면 확장", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러를 하나씩 골라 주세요")}${lead("블랙·그레이·그린·오렌지는 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러의 캐리어 1개가 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map(optRow).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 ${COLORS.length}개 옵션 (${COLORS.map((c) => c.ko).join(" · ")})</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("접어서 들고, 펼쳐서 쉬게 하는 이동 백")}${lead(COPY.mood)}`)}
${img("look-expand.jpg", "Expand look")}
${caption("EXPANDABLE · MESH VENT")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 캐리어를 고르는 2가지 이유")}${lead("확장 공간과 통풍·시인성으로 짧은 이동부터 여행까지 부담을 줄입니다.")}`, T.paper, "56px 32px 0")}
${point("01", "사면 확장 메시", "지퍼를 열면 사면이 펼쳐져 공간이 넓어집니다. 통풍이 잘 되고 답답함을 줄여 줍니다.", "look-expand.jpg", "4-WAY EXPAND")}
${point("02", "반사 테이프 · 멀티 오픈", "측면 반사 테이프로 야간 시인성을 높이고, 상단·측면 등 여러 방향으로 여닫을 수 있습니다.", "hero-grey.jpg", "SAFE TRAVEL")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("네 가지 컬러, 원하는 1개를 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>${COLORS.map(colorCell).join("")}</tr></table>`, T.cream)}
${img("hero-green.jpg", "Green look")}
${caption("GREEN · WEEKEND OUTING")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("확장된 상태의 실물 컷입니다. 메시 날개, 내부 패드, 안전 고리와 컬러감을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>${COLORS.map(designCell).join("")}</tr></table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", "약 46×28×28cm")}${row("구성", "소프트 펫 캐리어 1개")}${row("소재", "옥스퍼드·메시·EVA 보드·플리스 패드")}${row("디테일", "사면 확장 · 반사 테이프 · 멀티 오픈 · 어깨끈/손잡이 · 내부 안전 고리")}${row("용도", "고양이·소형견 이동")}${row("무게", "약 1.35kg")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다. 항공사별 기내 반입 규정은 이용 전 확인해 주세요.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", TITLE_INTERNAL)}${row("Package", "소프트 펫 캐리어 1개")}${row("Color", `${colorList} 중 택1`)}${row("Size", "약 46×28×28cm")}${row("Material", "Cloth / Oxford / Mesh / EVA")}${row("Care", "내부 패드는 분리 세탁 가능 · 본체는 라벨 확인")}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("USE")}${h2("이렇게 사용해 보세요")}${look("CAR", COPY.styling[0]!)}${look("HOME", COPY.styling[1]!)}${look("COLOR", COPY.styling[2]!)}`)}
${sec(`${kicker("FAQ")}${h2("구매 전 확인해 주세요")}
  ${COPY.faq.map((f) => `<div style="margin:0 0 12px;padding:16px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 6px;font-size:16px;font-weight:800">Q. ${esc(f.q)}</p><p style="margin:0;font-size:15px;line-height:1.7;color:${T.fog}">${esc(f.a)}</p></div>`).join("")}`, T.cream)}
${sec(`${kicker("SHIPPING")}${h2("배송 · 교환 · 반품 안내")}
  <div style="margin:0 0 18px;padding:18px 18px 16px;background:#fff;border:2px solid ${T.ink};border-radius:12px">
    <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:${T.ink}">필독 · 교환/반품 비용 (해외배송 왕복비용) <span style="white-space:nowrap">48,000원</span></p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:${T.ink}">- 이 상품은 해외배송 상품이므로, 반품비용이 해외택배 기준으로 발생하여 공제되므로 구매 시 반드시 참고 바랍니다. 단순 변심 등 무분별한 구매를 삼가 주시기를 부탁드립니다.</p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:${T.ink}">- 다만 제품의 하자가 있는 경우에는 절반을 판매자가 부담하여 <strong>24,000원</strong> 반품비용이 공제됩니다.</p>
  </div>
  <table style="width:100%;border-collapse:collapse">
  ${row("배송", "LEXI 소싱 해외배송 · 결제 후 영업일 기준 7~14일 도착")}
  ${row("통관", "해외배송 상품으로 수령인 개인통관고유부호가 필요할 수 있습니다")}
  ${row("교환·반품", "수령 후 7일 이내 접수 · 해외배송 왕복비용 48,000원 공제 (제품 하자 시 24,000원)")}
  ${row("유의", "모니터 환경에 따라 실제 색상과 다소 차이가 있을 수 있습니다")}
  </table>`)}
<p style="margin:0;padding:22px 32px;text-align:center;font-size:13px;color:${T.fog}">LEXI Curated · 해외배송 · © LEXI</p>
</div>`;
}

function page(frag: string, ogPath: string) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(TITLE)} · LEXI</title>
<meta name="description" content="${esc(COPY.subtitle)}"/>
<meta property="og:title" content="${esc(TITLE)} · LEXI"/>
<meta property="og:description" content="${esc(COPY.subtitle)}"/>
<meta property="og:image" content="${ogPath}"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"/>
<style>:root{word-break:keep-all}body{margin:0;background:#ebe6dc}h1,h2,h3{text-wrap:balance}</style>
</head><body>${frag}</body></html>`;
}

async function main() {
  await images();
  const frag = fragment();
  writeFileSync(`${OUT}/detail-fragment.html`, frag, "utf8");
  writeFileSync(`${OUT}/index.html`, page(frag, `${BASE}/og.jpg`), "utf8");
  writeFileSync(`${DIR}/index.html`, page(frag, `${SITE}/${SLUG}/og-opt.webp`), "utf8");
  writeFileSync(`${PUBLIC}/detail-fragment.html`, frag, "utf8");
  console.log("built", SHOTS.length, "images", frag.length, "chars", "→", OUT, PUBLIC);
}

if (process.argv[1]?.includes("build-pet-carrier-coupang")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
