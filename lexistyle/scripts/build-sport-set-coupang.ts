/**
 * 쿠팡 상세페이지 v1 — 플리스 후드·조거 투피스 세트
 * (상의+하의 1세트 · 브라운/스카이블루/라이트퍼플 택1 · S~3XL)
 * 입력: tmp/pdp-source/sport-set/{brown,sky,purple}.jpg
 *       tmp/pdp-source/sport-set/product-{brown,sky,purple}.jpg
 *       tmp/pdp-source/sport-set/desc/d-01.jpg (하의 사이즈표), d-02.jpg (상의 사이즈표)
 * 출력: pdp-site/<slug>/coupang/v1/*
 * Usage: npx tsx scripts/build-sport-set-coupang.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "mens-fleece-hoodie-jogger-set";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/pdp-source/sport-set";

export const TITLE = "플리스 후드·조거 투피스 세트";
export const COUPANG_NAME = `LEXI 남성 ${TITLE}`;
const TITLE_INTERNAL = "Trendy Casual Sport Two-piece Set";

const CAST = {
  name: "윤재하 · Yoon Jaeha",
  gender: "남성",
  nationality: "대한민국",
  interests: ["스트리트", "스니커즈", "시티 산책"],
};

const COLORS = [
  { ko: "브라운", en: "BROWN", hero: "hero-brown.jpg", product: "product-brown.jpg", src: "brown" },
  { ko: "스카이블루", en: "SKY BLUE", hero: "hero-sky.jpg", product: "product-sky.jpg", src: "sky" },
  { ko: "라이트퍼플", en: "LIGHT PURPLE", hero: "hero-purple.jpg", product: "product-purple.jpg", src: "purple" },
];

const SIZE_TOP = [
  { s: "S", shoulder: 42, chest: 102, len: 65, height: "160~165", weight: "50~55" },
  { s: "M", shoulder: 44, chest: 106, len: 67, height: "165~170", weight: "55~60" },
  { s: "L", shoulder: 46, chest: 110, len: 69, height: "170~175", weight: "60~68" },
  { s: "XL", shoulder: 48, chest: 114, len: 71, height: "175~180", weight: "68~78" },
  { s: "2XL", shoulder: 50, chest: 118, len: 73, height: "180~185", weight: "78~88" },
  { s: "3XL", shoulder: 52, chest: 122, len: 75, height: "185~188", weight: "88~95" },
];
const SIZE_PANTS = [
  { s: "S", waist: 68, hip: 92, len: 100, height: "160~165", weight: "50~55" },
  { s: "M", waist: 71, hip: 96, len: 102, height: "165~170", weight: "55~60" },
  { s: "L", waist: 74, hip: 100, len: 104, height: "170~175", weight: "60~68" },
  { s: "XL", waist: 77, hip: 104, len: 106, height: "175~180", weight: "68~78" },
  { s: "2XL", waist: 80, hip: 108, len: 108, height: "180~185", weight: "78~88" },
  { s: "3XL", waist: 83, hip: 112, len: 110, height: "185~190", weight: "88~95" },
];
const SIZE_LABELS = SIZE_TOP.map((r) => r.s);

const COPY = {
  subtitle: "브라운·스카이블루·라이트퍼플 3가지 컬러 중 원하는 1세트",
  lead: "같은 컬러의 플리스 후드와 조거 팬츠가 한 세트로 구성됩니다. 캥거루 포켓·립 커프스·웨이스트 스트링까지 캐주얼 스포츠룩에 필요한 디테일을 담았습니다.",
  mood: "상의와 하의를 따로 맞출 필요 없이, 컬러만 고르면 세트가 완성됩니다. 플리스 안감으로 봄·가을 간절기와 가벼운 외출에 편하게 입을 수 있는 베이직 투피스입니다.",
  styling: [
    "화이트 스니커즈와 캡을 더하면 출근 전 카페나 주말 시티 산책에 맞는 미니멀 스트리트 룩이 됩니다.",
    "후드만 입고 데님과 매치하거나, 조거만 입고 티셔츠와 조합해 세트를 풀어 입을 수도 있습니다.",
    "스카이블루·라이트퍼플처럼 부드러운 컬러는 스니커즈 톤을 맞춰 주면 한결 정돈된 인상을 줍니다.",
  ],
  faq: [
    { q: "상의와 하의가 따로 오나요?", a: "아닙니다. 주문하신 컬러·사이즈의 후드 1장 + 조거 팬츠 1벌이 한 세트로 배송됩니다." },
    { q: "세 가지 컬러가 함께 오나요?", a: "아닙니다. 브라운·스카이블루·라이트퍼플은 각각 별도의 옵션입니다. 선택하신 컬러 1세트만 배송됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈 기준입니다. 하단 상의·하의 사이즈 가이드의 가슴둘레·허리·권장 키·체중을 참고해 주세요. 두 사이즈 사이라면 큰 사이즈를 권장합니다." },
    { q: "기모(플리스)인가요?", a: "상품 정보에 플리스 안감으로 안내되어 있습니다. 계절·체감 보온감은 개인에 따라 다를 수 있습니다." },
    { q: "세탁은 어떻게 하나요?", a: "세탁 전 제품 안쪽 라벨의 관리 방법을 확인해 주세요." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품으로 교환·반품 시 해외배송 왕복비용 48,000원이 공제됩니다. 제품 하자의 경우 절반을 판매자가 부담하여 24,000원이 공제됩니다." },
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = { file: string; src: string; crop?: Crop; w: number; h: number; webp?: string; fit?: keyof sharp.FitEnum };

const SHOTS: Shot[] = [
  { file: "hero-brown.jpg", src: "brown", w: 900, h: 1200, webp: "assets/s1-hero-opt.webp" },
  { file: "hero-sky.jpg", src: "sky", w: 900, h: 1200, webp: "assets/s1-hero-sky-opt.webp" },
  { file: "hero-purple.jpg", src: "purple", w: 900, h: 1200, webp: "assets/s1-hero-purple-opt.webp" },
  { file: "look-brown-upper.jpg", src: "brown", crop: { left: 132, top: 40, width: 600, height: 600 }, w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "product-brown.jpg", src: "product-brown", w: 1000, h: 1000 },
  { file: "product-sky.jpg", src: "product-sky", w: 1000, h: 1000 },
  { file: "product-purple.jpg", src: "product-purple", w: 1000, h: 1000 },
  { file: "detail-hoodie.jpg", src: "product-brown", crop: { left: 20, top: 20, width: 360, height: 360 }, w: 720, h: 720, webp: "assets/s2-detail-opt.webp" },
  { file: "detail-pocket.jpg", src: "product-brown", crop: { left: 80, top: 220, width: 280, height: 280 }, w: 720, h: 720 },
  { file: "detail-pants.jpg", src: "product-sky", crop: { left: 400, top: 40, width: 360, height: 360 }, w: 720, h: 720 },
  { file: "size-pants.jpg", src: "desc/d-01", w: 1000, h: 700, fit: "inside" },
  { file: "size-top.jpg", src: "desc/d-02", w: 1000, h: 700, fit: "inside" },
  { file: "og.jpg", src: "brown", crop: { left: 0, top: 90, width: 864, height: 454 }, w: 1200, h: 630, webp: "og-opt.webp" },
  { file: "rep-brown.jpg", src: "brown", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-sky.jpg", src: "sky", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-purple.jpg", src: "purple", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
];

async function images() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(`${DIR}/assets`, { recursive: true });
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
    const fit = s.fit ?? "cover";
    const buf = await img.resize(s.w, s.h, { fit, position: "north", background: "#ffffff" }).toBuffer();
    await sharp(buf).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/${s.file}`);
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
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${c.ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">세트 1벌</span></p>
    <div>${SIZE_LABELS.map((s) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${s}</span>`).join("")}</div></td></tr>`;
  const colorCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:33.33%;padding:0 ${i === 2 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img(c.hero, c.en)}</div><p style="margin:12px 0 0;font-size:17px;font-weight:800;text-align:center">${c.ko}</p></td>`;
  const designCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:33.33%;padding:0 ${i === 2 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img(c.product, c.en)}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">${c.ko}</p></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const sizeList = SIZE_LABELS.join(" · ");

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">MEN'S SET · SPRING/FALL</span>
</div>
${img("hero-brown.jpg", "Hero")}
${sec(`${kicker("CITY EASY SET")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("브라운 · 스카이블루 · 라이트퍼플 택1")}${chip("S ~ 3XL")}${chip("구성: 후드+팬츠")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "후드+팬츠")}${stat("컬러", "3종 택1")}${stat("안감", "플리스")}${stat("사이즈", "S ~ 3XL", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("브라운·스카이블루·라이트퍼플은 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 후드+조거 1세트가 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map(optRow).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 ${COLORS.length * SIZE_LABELS.length}개 옵션 (${COLORS.map((c) => c.ko).join(" · ")} × ${sizeList})</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("컬러만 고르면 끝나는 이지 투피스")}${lead(COPY.mood)}`)}
${img("look-brown-upper.jpg", "Brown look")}
${caption("BROWN · CITY WALK")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 세트를 고르는 4가지 이유")}${lead("상의와 하의를 같은 톤으로 맞춰, 코디 고민을 줄였습니다.")}`, T.paper, "56px 32px 0")}
${point("01", "후드 + 조거 한 세트", "같은 컬러의 풀오버 후드와 테이퍼드 조거 팬츠가 한 번에 구성됩니다. 따로 사지 않아도 세트 룩이 완성됩니다.", "product-brown.jpg", "MATCHING SET")}
${point("02", "캥거루 포켓 후드", "앞쪽에 넓은 캥거루 포켓이 있어 손을 넣거나 작은 소지품을 넣기 편합니다. 립 커프스와 밑단이 라인을 단정하게 잡아 줍니다.", "detail-pocket.jpg", "KANGAROO POCKET")}
${point("03", "스트링 조거 팬츠", "허리 밴딩과 스트링으로 허리를 조절하고, 발목 립 커프스가 조거 실루엣을 만듭니다. 사이드 포켓도 있습니다.", "detail-pants.jpg", "JOGGER PANTS")}
${point("04", "플리스 안감", "플리스 안감으로 가벼운 운동·산책·실내 착용에 맞는 보온감을 더했습니다. 봄·가을 간절기에 부담 없이 입을 수 있습니다.", "detail-hoodie.jpg", "FLEECE LINED")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("세 가지 컬러, 원하는 1세트를 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>${COLORS.map(colorCell).join("")}</tr></table>`, T.cream)}
${img("hero-sky.jpg", "Sky look")}
${caption("SKY BLUE · WEEKEND LIGHT")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 세트만 촬영한 단독 컷입니다. 후드 포켓, 조거 스트링, 립 커프스와 컬러감을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>${COLORS.map(designCell).join("")}</tr></table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", sizeList)}${row("구성", "후드 1장 + 조거 팬츠 1벌")}${row("소재", "폴리에스터")}${row("안감", "플리스")}${row("상의", "긴소매 풀오버 후드 · 캥거루 포켓 · 립 커프스/밑단")}${row("하의", "긴바지 조거 · 밴딩+스트링 · 사이드 포켓 · 발목 립")}${row("성별", "남성")}${row("시즌", "봄 · 가을 간절기")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>`)}
${sec(`${kicker("REAL DETAIL")}${h2("실물 디테일")}${lead("후드 포켓, 조거 허리 스트링, 립 마감을 가까이에서 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>
    <td style="width:33.33%;padding:0 4px 0 0;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-hoodie.jpg", "Hoodie")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">후드</p></td>
    <td style="width:33.33%;padding:0 4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-pocket.jpg", "Pocket")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">캥거루 포켓</p></td>
    <td style="width:33.33%;padding:0 0 0 4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-pants.jpg", "Pants")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">조거 팬츠</p></td>
  </tr></table>`)}
${sec(`${kicker("MODEL CAST")}${h2("이 상품의 화보 모델")}
  <table style="width:100%;border-collapse:collapse">${row("이름", CAST.name)}${row("성별", CAST.gender)}${row("국적", CAST.nationality)}${row("관심사", CAST.interests.join(" · "))}${row("소속사", "AMBA (AI Ambassador)")}</table>`, T.cream)}
${sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <p style="margin:0 0 10px;font-size:16px;font-weight:800">상의 (후드)</p>
  <table style="width:100%;border-collapse:collapse;background:#fff;margin-bottom:8px">
    <tr>${th("사이즈")}${th("어깨")}${th("가슴")}${th("총장")}${th("권장키")}${th("권장체중")}</tr>
    ${SIZE_TOP.map((r) => `<tr>${td(r.s, true)}${td(r.shoulder)}${td(r.chest)}${td(r.len)}${td(r.height)}${td(r.weight)}</tr>`).join("")}
  </table>
  <div style="border-radius:12px;overflow:hidden;background:#fff;margin:0 0 28px">${img("size-top.jpg", "Top size chart")}</div>
  <p style="margin:0 0 10px;font-size:16px;font-weight:800">하의 (조거)</p>
  <table style="width:100%;border-collapse:collapse;background:#fff;margin-bottom:8px">
    <tr>${th("사이즈")}${th("허리")}${th("엉덩이")}${th("총장")}${th("권장키")}${th("권장체중")}</tr>
    ${SIZE_PANTS.map((r) => `<tr>${td(r.s, true)}${td(r.waist)}${td(r.hip)}${td(r.len)}${td(r.height)}${td(r.weight)}</tr>`).join("")}
  </table>
  <div style="border-radius:12px;overflow:hidden;background:#fff">${img("size-pants.jpg", "Pants size chart")}</div>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">단위 cm · 수작업 측정으로 1~3cm 오차가 있을 수 있습니다.<br/>아시아 사이즈로 일반 해외 브랜드보다 1~2 사이즈 작게 나옵니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", TITLE_INTERNAL)}${row("Package", "후드 1장 + 조거 팬츠 1벌")}${row("Fit", "캐주얼 루즈 · 남성")}${row("Color", `${colorList} 중 택1`)}${row("Size", sizeList)}${row("Season", "봄 · 가을 간절기")}${row("Material", "폴리에스터 · 플리스 안감")}${row("Care", "세탁 전 제품 라벨의 관리 방법을 확인해 주세요")}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("STYLING")}${h2("이렇게 입어 보세요")}${look("CITY", COPY.styling[0]!)}${look("WEEKEND", COPY.styling[1]!)}${look("COLOR", COPY.styling[2]!)}`)}
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
<html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
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
  console.log("built", SHOTS.length, "images", frag.length, "chars");
}

if (process.argv[1]?.includes("build-sport-set-coupang")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
