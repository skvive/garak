/**
 * 쿠팡 상세페이지 v1 — 후드 니트 가디건
 * (가디건 1벌 · 핑크/오렌지/그레이/아이보리/레드/차콜 택1 · S~5XL)
 * 입력: tmp/pdp-source/cardigan/{pink,orange,grey,ivory,red,charcoal}.jpg
 *       tmp/pdp-source/cardigan/product-*.jpg · size-chart.jpg
 * 출력: pdp-site/<slug>/coupang/v1/*
 * Usage: npx tsx scripts/build-cardigan-coupang.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "womens-hooded-knit-cardigan";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/pdp-source/cardigan";
const PUBLIC = "public/pdp/cjwy2709996-cardigan";

export const TITLE = "후드 니트 가디건";
export const COUPANG_NAME = `LEXI 여성 ${TITLE}`;
const TITLE_INTERNAL = "Women's American Style Relaxed Fit Hooded Cardigan";

const CAST = {
  name: "송다인 · Song Dain",
  gender: "여성",
  nationality: "대한민국",
  interests: ["데일리룩", "니트", "카페"],
};

const COLORS = [
  { ko: "핑크", en: "PINK", hero: "hero-pink.jpg", product: "product-pink.jpg", src: "pink", productSrc: "product-pink" },
  { ko: "오렌지", en: "ORANGE", hero: "hero-orange.jpg", product: "product-orange.jpg", src: "orange", productSrc: "product-orange" },
  { ko: "그레이", en: "GREY", hero: "hero-grey.jpg", product: "product-grey.jpg", src: "grey", productSrc: "product-grey" },
  { ko: "아이보리", en: "IVORY", hero: "hero-ivory.jpg", product: "product-ivory.jpg", src: "ivory", productSrc: "product-ivory" },
  { ko: "레드", en: "RED", hero: "hero-red.jpg", product: "product-red.jpg", src: "red", productSrc: "product-red" },
  { ko: "차콜", en: "CHARCOAL", hero: "hero-charcoal.jpg", product: "product-charcoal.jpg", src: "charcoal", productSrc: "product-charcoal" },
];

const SIZE = [
  { s: "S", len: 65, bust: 108, sleeve: 60, shoulder: 43.7 },
  { s: "M", len: 66, bust: 113, sleeve: 61, shoulder: 45 },
  { s: "L", len: 67, bust: 118, sleeve: 62, shoulder: 46.3 },
  { s: "XL", len: 68, bust: 123, sleeve: 63, shoulder: 47.6 },
  { s: "XXL", len: 69, bust: 128, sleeve: 64, shoulder: 48.9 },
  { s: "3XL", len: 70, bust: 133, sleeve: 65, shoulder: 50.2 },
  { s: "4XL", len: 71, bust: 138, sleeve: 66, shoulder: 51.5 },
  { s: "5XL", len: 72, bust: 143, sleeve: 67, shoulder: 52.8 },
];
const SIZE_LABELS = SIZE.map((r) => r.s);

const COPY = {
  subtitle: "핑크·오렌지·그레이·아이보리·레드·차콜 6가지 컬러 중 원하는 1벌",
  lead: "후드와 앞 버튼이 있는 루즈핏 니트 가디건입니다. 리브 커프스와 여유 있는 실루엣으로 데일리 아우터로 입기 좋습니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.",
  mood: "단추를 잠그면 후드 니트처럼, 열어 걸치면 가벼운 가디건처럼 연출됩니다. 두툼한 니트 텍스처가 봄·가을 간절기와 실내 냉방 환경에 맞는 레이어드룩을 만들어 줍니다.",
  styling: [
    "화이트 티셔츠와 데님 위에 앞을 열어 걸치면 카페·산책에 맞는 이지 데일리 룩이 됩니다.",
    "슬랙스와 로퍼를 매치하고 단추를 채우면 단정한 니트 아우터 무드로 연출할 수 있습니다.",
    "아이보리·핑크처럼 밝은 톤은 스니커즈와, 차콜·레드는 블랙 팬츠와 맞추면 정돈된 인상을 줍니다.",
  ],
  faq: [
    { q: "여섯 가지 컬러가 함께 오나요?", a: "아닙니다. 핑크·오렌지·그레이·아이보리·레드·차콜은 각각 별도의 옵션입니다. 선택하신 컬러·사이즈의 가디건 1벌만 배송됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈 기준의 루즈핏입니다. 하단 사이즈 가이드의 가슴둘레·총장을 참고해 주세요. 두 사이즈 사이라면 큰 사이즈를 권장합니다." },
    { q: "후드가 달린 가디건인가요?", a: "네. 후드와 앞 버튼이 있는 니트 가디건입니다. 단추를 잠그거나 열어 걸치는 방식으로 연출할 수 있습니다." },
    { q: "세탁은 어떻게 하나요?", a: "세탁 전 제품 안쪽 라벨의 관리 방법을 확인해 주세요." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품으로 교환·반품 시 해외배송 왕복비용 48,000원이 공제됩니다. 제품 하자의 경우 절반을 판매자가 부담하여 24,000원이 공제됩니다." },
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = {
  file: string;
  src: string;
  crop?: Crop;
  w: number;
  h: number;
  webp?: string;
  fit?: keyof sharp.FitEnum;
  pad?: boolean;
};

const SHOTS: Shot[] = [
  { file: "hero-ivory.jpg", src: "ivory", w: 900, h: 1200, webp: "assets/s1-hero-opt.webp" },
  { file: "hero-pink.jpg", src: "pink", w: 900, h: 1200, webp: "assets/s1-hero-pink-opt.webp" },
  { file: "hero-orange.jpg", src: "orange", w: 900, h: 1200 },
  { file: "hero-grey.jpg", src: "grey", w: 900, h: 1200 },
  { file: "hero-red.jpg", src: "red", w: 900, h: 1200 },
  { file: "hero-charcoal.jpg", src: "charcoal", w: 900, h: 1200 },
  { file: "look-ivory-upper.jpg", src: "ivory", crop: { left: 132, top: 40, width: 600, height: 600 }, w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "product-pink.jpg", src: "product-pink", w: 1000, h: 1000 },
  { file: "product-orange.jpg", src: "product-orange", w: 1000, h: 1000 },
  { file: "product-grey.jpg", src: "product-grey", w: 1000, h: 1000 },
  { file: "product-ivory.jpg", src: "product-ivory", w: 1000, h: 1000 },
  { file: "product-red.jpg", src: "product-red", w: 1000, h: 1000 },
  { file: "product-charcoal.jpg", src: "product-charcoal", w: 1000, h: 1000 },
  { file: "detail-hood.jpg", src: "product-ivory", crop: { left: 80, top: 10, width: 220, height: 220 }, w: 720, h: 720, webp: "assets/s2-detail-opt.webp" },
  { file: "detail-button.jpg", src: "product-ivory", crop: { left: 140, top: 120, width: 120, height: 120 }, w: 720, h: 720 },
  { file: "detail-cuff.jpg", src: "product-charcoal", crop: { left: 40, top: 300, width: 160, height: 160 }, w: 720, h: 720 },
  { file: "size-chart.jpg", src: "size-chart", w: 1000, h: 1000, fit: "inside", pad: true },
  { file: "og.jpg", src: "ivory", crop: { left: 0, top: 90, width: 864, height: 454 }, w: 1200, h: 630, webp: "og-opt.webp" },
  { file: "coupang-main.jpg", src: "ivory", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-pink.jpg", src: "pink", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-ivory.jpg", src: "ivory", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-charcoal.jpg", src: "charcoal", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
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
    if (s.pad) {
      const resized = await sharp(`${SRC}/${s.src}.jpg`)
        .resize(s.w, s.h, { fit: "inside", background: "#ffffff" })
        .toBuffer();
      const buf = await sharp({
        create: { width: s.w, height: s.h, channels: 3, background: "#ffffff" },
      })
        .composite([{ input: resized, gravity: "centre" }])
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      await sharp(buf).toFile(`${OUT}/${s.file}`);
      await sharp(buf).toFile(`${PUBLIC}/${s.file}`);
      continue;
    }
    const fit = s.fit ?? "cover";
    const buf = await img.resize(s.w, s.h, { fit, position: "north", background: "#ffffff" }).toBuffer();
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
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${c.ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">가디건 1벌</span></p>
    <div>${SIZE_LABELS.map((s) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${s}</span>`).join("")}</div></td></tr>`;
  const colorCell = (c: (typeof COLORS)[number]) => `<td style="width:33.33%;padding:4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img(c.hero, c.en)}</div><p style="margin:12px 0 0;font-size:16px;font-weight:800;text-align:center">${c.ko}</p></td>`;
  const designCell = (c: (typeof COLORS)[number]) => `<td style="width:33.33%;padding:4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img(c.product, c.en)}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">${c.ko}</p></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const sizeList = SIZE_LABELS.join(" · ");
  const colorRows = [COLORS.slice(0, 3), COLORS.slice(3, 6)];

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">WOMEN'S KNIT · DAILY</span>
</div>
${img("hero-ivory.jpg", "Hero")}
${sec(`${kicker("HOOD CARDIGAN")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("6컬러 택1")}${chip("S ~ 5XL")}${chip("후드·버튼 니트")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "가디건 1벌")}${stat("컬러", "6종 택1")}${stat("핏", "루즈")}${stat("사이즈", "S ~ 5XL", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("여섯 가지 컬러는 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 가디건 1벌이 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map(optRow).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 ${COLORS.length * SIZE_LABELS.length}개 옵션 (${COLORS.map((c) => c.ko).join(" · ")} × ${sizeList})</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("잠그면 니트, 열면 가디건")}${lead(COPY.mood)}`)}
${img("look-ivory-upper.jpg", "Ivory look")}
${caption("IVORY · DAILY LAYER")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 가디건을 고르는 4가지 이유")}${lead("후드·버튼·리브 마감으로 데일리 레이어드를 편하게 만듭니다.")}`, T.paper, "56px 32px 0")}
${point("01", "후드 달린 니트 가디건", "후드와 앞 버튼이 함께 있어 잠그거나 열어 걸치는 연출이 가능합니다.", "detail-hood.jpg", "HOOD + BUTTON")}
${point("02", "루즈핏 실루엣", "어깨와 가슴에 여유가 있어 티셔츠·니트 위에 가볍게 걸치기 좋습니다.", "product-ivory.jpg", "RELAXED FIT")}
${point("03", "리브 커프스 마감", "소매와 밑단 리브가 라인을 단정하게 잡아 주고, 니트 텍스처가 돋보입니다.", "detail-cuff.jpg", "RIB CUFF")}
${point("04", "6가지 솔리드 컬러", "핑크부터 차콜까지 솔리드 톤으로 데일리 코디에 맞추기 쉽습니다.", "hero-pink.jpg", "SIX COLORS")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("여섯 가지 컬러, 원하는 1벌을 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px">${colorRows.map((rowColors) => `<tr>${rowColors.map(colorCell).join("")}</tr>`).join("")}</table>`, T.cream)}
${img("hero-charcoal.jpg", "Charcoal look")}
${caption("CHARCOAL · CITY WALK")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 가디건만 촬영한 단독 컷입니다. 후드, 버튼, 리브 커프스와 컬러감을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px">${colorRows.map((rowColors) => `<tr>${rowColors.map(designCell).join("")}</tr>`).join("")}</table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", sizeList)}${row("구성", "후드 니트 가디건 1벌")}${row("소재", "폴리에스터")}${row("디테일", "후드 · 앞 버튼 · 리브 커프스/밑단")}${row("핏", "루즈 · 릴렉스드")}${row("성별", "여성")}${row("시즌", "봄 · 가을 간절기")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>`)}
${sec(`${kicker("REAL DETAIL")}${h2("실물 디테일")}${lead("후드, 버튼, 리브 마감을 가까이에서 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>
    <td style="width:33.33%;padding:0 4px 0 0;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-hood.jpg", "Hood")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">후드</p></td>
    <td style="width:33.33%;padding:0 4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-button.jpg", "Button")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">앞 버튼</p></td>
    <td style="width:33.33%;padding:0 0 0 4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-cuff.jpg", "Cuff")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">리브 커프스</p></td>
  </tr></table>`)}
${sec(`${kicker("MODEL CAST")}${h2("이 상품의 화보 모델")}
  <table style="width:100%;border-collapse:collapse">${row("이름", CAST.name)}${row("성별", CAST.gender)}${row("국적", CAST.nationality)}${row("관심사", CAST.interests.join(" · "))}${row("소속사", "AMBA (AI Ambassador)")}</table>`, T.cream)}
${sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <table style="width:100%;border-collapse:collapse;background:#fff;margin-bottom:8px">
    <tr>${th("사이즈")}${th("총장")}${th("가슴")}${th("소매")}${th("어깨")}</tr>
    ${SIZE.map((r) => `<tr>${td(r.s, true)}${td(r.len)}${td(r.bust)}${td(r.sleeve)}${td(r.shoulder)}</tr>`).join("")}
  </table>
  <div style="border-radius:12px;overflow:hidden;background:#fff">${img("size-chart.jpg", "Size chart")}</div>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">단위 cm · 수작업 측정으로 1~3cm 오차가 있을 수 있습니다.<br/>아시아 사이즈로 일반 해외 브랜드보다 1~2 사이즈 작게 나옵니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", TITLE_INTERNAL)}${row("Package", "후드 니트 가디건 1벌")}${row("Fit", "루즈 · 여성")}${row("Color", `${colorList} 중 택1`)}${row("Size", sizeList)}${row("Season", "봄 · 가을 간절기")}${row("Material", "폴리에스터")}${row("Care", "세탁 전 제품 라벨의 관리 방법을 확인해 주세요")}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("STYLING")}${h2("이렇게 입어 보세요")}${look("DAILY", COPY.styling[0]!)}${look("NEAT", COPY.styling[1]!)}${look("COLOR", COPY.styling[2]!)}`)}
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

if (process.argv[1]?.includes("build-cardigan-coupang")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
