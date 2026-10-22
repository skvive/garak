/**
 * 쿠팡 상세페이지 v1 — 남성 골지 모크넥 스웨트셔츠
 * (1벌 · 5컬러 택1 · S~3XL, 카키는 XL 없음)
 * Usage: npx tsx scripts/build-mens-sweatshirt-coupang.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "mens-ribbed-mock-neck-sweatshirt";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/pdp-source/mens-sweatshirt";
const PUBLIC = "public/pdp/cjwy3225409-sweatshirt";

export const TITLE = "골지 모크넥 스웨트셔츠";
export const COUPANG_NAME = `LEXI 남성 ${TITLE}`;
const TITLE_INTERNAL = "Men's Ribbed Mock-neck Sweatshirt";

const CAST = {
  name: "박서준 · Park Seojun",
  gender: "남성",
  nationality: "대한민국",
  interests: ["비즈니스캐주얼", "시티 워크", "미니멀"],
};

const COLORS = [
  { ko: "블랙", en: "BLACK", hero: "hero-black.jpg", product: "product-black.jpg", src: "black", productSrc: "product-black" },
  { ko: "화이트", en: "WHITE", hero: "hero-white.jpg", product: "product-white.jpg", src: "white", productSrc: "product-white" },
  { ko: "다크그레이", en: "DARK GRAY", hero: "hero-dark-gray.jpg", product: "product-dark-gray.jpg", src: "dark-gray", productSrc: "product-dark-gray" },
  { ko: "아미그린", en: "ARMY GREEN", hero: "hero-army-green.jpg", product: "product-army-green.jpg", src: "army-green", productSrc: "product-army-green" },
  { ko: "카키", en: "KHAKI", hero: "hero-khaki.jpg", product: "product-khaki.jpg", src: "khaki", productSrc: "product-khaki" },
];

const SIZE_LABELS = ["S", "M", "L", "XL", "2XL", "3XL"];

const COPY = {
  subtitle: "블랙·화이트·다크그레이·아미그린·카키 5가지 컬러 중 원하는 1벌",
  lead: "세로 골지 텍스처의 모크넥 스웨트셔츠입니다. 카라·엘보우 패치의 스웨이드 톤 배색과 쿼터 버튼으로 캐주얼에 정돈감을 더합니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.",
  mood: "단독으로 입어도, 아우터 안에 받쳐 입어도 선이 깔끔합니다. 봄·가을 간절기와 실내 냉방 환경에 쓰기 좋은 두께감입니다.",
  styling: [
    "슬랙스와 로퍼를 매치하면 출근·미팅용 스마트 캐주얼이 됩니다.",
    "데님과 스니커즈를 맞추면 주말 시티 산책에도 부담이 없습니다.",
    "블랙·다크그레이는 정장에, 화이트·카키·아미그린은 캐주얼 배색에 잘 맞습니다.",
  ],
  faq: [
    { q: "다섯 가지 컬러가 함께 오나요?", a: "아닙니다. 블랙·화이트·다크그레이·아미그린·카키는 각각 별도의 옵션입니다. 선택하신 컬러·사이즈의 스웨트셔츠 1벌만 배송됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈 기준입니다. S~3XL 중 평소 상의 사이즈를 참고해 선택해 주세요. 카키는 XL 옵션이 없습니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다." },
    { q: "엘보우 패치가 있나요?", a: "네. 카라 안쪽과 엘보우 패치에 스웨이드 톤 배색이 있습니다." },
    { q: "세탁은 어떻게 하나요?", a: "세탁 전 제품 안쪽 라벨의 관리 방법을 확인해 주세요." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품으로 교환·반품 시 해외배송 왕복비용 48,000원이 공제됩니다. 제품 하자의 경우 절반을 판매자가 부담하여 24,000원이 공제됩니다." },
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = { file: string; src: string; crop?: Crop; w: number; h: number; webp?: string; fit?: "cover" | "contain" };

const SHOTS: Shot[] = [
  { file: "hero-black.jpg", src: "black", w: 900, h: 1200, webp: "assets/s1-hero-opt.webp" },
  { file: "hero-white.jpg", src: "white", w: 900, h: 1200 },
  { file: "hero-dark-gray.jpg", src: "dark-gray", w: 900, h: 1200 },
  { file: "hero-army-green.jpg", src: "army-green", w: 900, h: 1200 },
  { file: "hero-khaki.jpg", src: "khaki", w: 900, h: 1200 },
  { file: "look-black-upper.jpg", src: "black", crop: { left: 120, top: 40, width: 620, height: 620 }, w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "product-black.jpg", src: "product-black", w: 1000, h: 1000, fit: "contain" },
  { file: "product-white.jpg", src: "product-white", w: 1000, h: 1000, fit: "contain" },
  { file: "product-dark-gray.jpg", src: "product-dark-gray", w: 1000, h: 1000, fit: "contain" },
  { file: "product-army-green.jpg", src: "product-army-green", w: 1000, h: 1000, fit: "contain" },
  { file: "product-khaki.jpg", src: "product-khaki", w: 1000, h: 1000, fit: "contain" },
  { file: "og.jpg", src: "black", crop: { left: 0, top: 100, width: 768, height: 403 }, w: 1200, h: 630, webp: "og-opt.webp" },
  { file: "coupang-main.jpg", src: "black", crop: { left: 48, top: 40, width: 672, height: 672 }, w: 1000, h: 1000 },
  ...COLORS.map((c) => ({
    file: `rep-${c.src}.jpg`,
    src: c.src,
    crop: { left: 48, top: 40, width: 672, height: 672 },
    w: 1000,
    h: 1000,
  })),
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
      .resize(s.w, s.h, { fit: s.fit ?? "cover", position: "north", background: "#ffffff" })
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
  const th = (t: string) => `<th style="padding:12px 6px;background:${T.ink};color:#fff;font-size:13px;font-weight:700">${t}</th>`;
  const td = (t: string | number, b = false) => `<td style="padding:12px 6px;border-bottom:1px solid ${T.line};text-align:center;font-size:14px;color:${T.ink};${b ? "font-weight:800" : ""}">${t}</td>`;
  const look = (tag: string, text: string) => `<div style="margin:0 0 10px;padding:16px 18px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${T.accent};letter-spacing:0.12em">${tag}</p><p style="margin:0;font-size:15px;line-height:1.6;color:${T.ink}">${esc(text)}</p></div>`;
  const optRow = (c: (typeof COLORS)[number]) => `<tr>
    <td style="width:34%;padding:10px 10px 10px 0;vertical-align:middle"><div style="border-radius:10px;overflow:hidden">${img(c.hero, c.en)}</div></td>
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${c.ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">스웨트셔츠 1벌</span></p>
    <div>${SIZE_LABELS.map((s) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${s}</span>`).join("")}</div>
    ${c.ko === "카키" ? `<p style="margin:8px 0 0;font-size:13px;color:${T.fog}">카키는 XL 옵션이 없습니다</p>` : ""}</td></tr>`;
  const colorCell = (c: (typeof COLORS)[number]) => `<td style="width:20%;padding:0 3px;vertical-align:top"><div style="border-radius:12px;overflow:hidden">${img(c.hero, c.en)}</div><p style="margin:10px 0 0;font-size:13px;font-weight:800;text-align:center">${c.ko}</p></td>`;
  const designCell = (c: (typeof COLORS)[number]) => `<td style="width:20%;padding:0 3px;vertical-align:top"><div style="border-radius:12px;overflow:hidden;background:#fff">${img(c.product, c.en)}</div><p style="margin:8px 0 0;font-size:12px;color:${T.fog};text-align:center">${c.ko}</p></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const sizeList = SIZE_LABELS.join(" · ");

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">MEN'S KNIT · SPRING/FALL</span>
</div>
${img("hero-black.jpg", "Hero")}
${sec(`${kicker("RIBBED MOCK NECK")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("5컬러 택1")}${chip("S ~ 3XL")}${chip("골지 · 모크넥")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "1벌")}${stat("컬러", "5종 택1")}${stat("디테일", "엘보우 패치")}${stat("사이즈", "S ~ 3XL", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("다섯 컬러는 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 스웨트셔츠 1벌이 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map(optRow).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 29개 옵션 (${COLORS.map((c) => c.ko).join(" · ")} × ${sizeList}, 카키 XL 제외)</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("골지와 배색이 만드는 정돈된 캐주얼")}${lead(COPY.mood)}`)}
${img("look-black-upper.jpg", "Black look")}
${caption("BLACK · SMART CASUAL")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 스웨트셔츠를 고르는 2가지 이유")}${lead("골지 텍스처와 스웨이드 톤 배색으로 데일리 룩에 무게감을 줍니다.")}`, T.paper, "56px 32px 0")}
${point("01", "세로 골지 텍스처", "바디와 소매에 이어지는 세로 골지가 실루엣을 또렷하게 잡습니다.", "product-black.jpg", "RIBBED BODY")}
${point("02", "카라·엘보우 배색", "모크넥 안쪽과 엘보우 패치의 스웨이드 톤 배색이 포인트를 줍니다. 쿼터 버튼으로 여밈을 조절할 수 있습니다.", "hero-khaki.jpg", "SUEDE ACCENT")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("다섯 가지 컬러, 원하는 1벌을 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>${COLORS.map(colorCell).join("")}</tr></table>`, T.cream)}
${img("hero-army-green.jpg", "Army green look")}
${caption("ARMY GREEN · WEEKEND")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 스웨트셔츠만 촬영한 단독 컷입니다. 골지, 버튼, 엘보우 패치와 컬러감을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>${COLORS.map(designCell).join("")}</tr></table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", `${sizeList} (카키 XL 없음)`)}${row("구성", "골지 모크넥 스웨트셔츠 1벌")}${row("소재", "니트 · 골지")}${row("디테일", "모크넥 · 쿼터 버튼 · 스웨이드 톤 카라/엘보우 패치 · 립 커프스/밑단")}${row("핏", "레귤러")}${row("성별", "남성")}${row("시즌", "봄 · 가을")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>`)}
${sec(`${kicker("MODEL CAST")}${h2("이 상품의 화보 모델")}
  <table style="width:100%;border-collapse:collapse">${row("이름", CAST.name)}${row("성별", CAST.gender)}${row("국적", CAST.nationality)}${row("관심사", CAST.interests.join(" · "))}${row("소속사", "AMBA (AI Ambassador)")}</table>`, T.cream)}
${sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <table style="width:100%;border-collapse:collapse;background:#fff;margin-bottom:8px">
    <tr>${th("사이즈")}${SIZE_LABELS.map((s) => th(s)).join("")}</tr>
    <tr>${td("선택", true)}${SIZE_LABELS.map((s) => td(s)).join("")}</tr>
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">아시아 사이즈 기준입니다. 평소 상의 사이즈를 참고해 선택해 주세요.<br/>카키는 XL 옵션이 없습니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", TITLE_INTERNAL)}${row("Package", "골지 모크넥 스웨트셔츠 1벌")}${row("Fit", "레귤러 · 남성")}${row("Color", `${colorList} 중 택1`)}${row("Size", sizeList)}${row("Season", "봄 · 가을")}${row("Material", "니트 · 골지")}${row("Care", "세탁 전 제품 라벨의 관리 방법을 확인해 주세요")}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("STYLING")}${h2("이렇게 입어 보세요")}${look("OFFICE", COPY.styling[0]!)}${look("WEEKEND", COPY.styling[1]!)}${look("COLOR", COPY.styling[2]!)}`)}
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

if (process.argv[1]?.includes("build-mens-sweatshirt-coupang")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
