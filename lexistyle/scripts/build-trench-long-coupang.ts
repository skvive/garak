/**
 * 쿠팡 상세페이지 v1 — 롱 스웨이드 트렌치코트
 * (코트 1벌 · 다크브라운/사파이어블루/그레이/블랙 택1 · XS~XXXL)
 * 입력: tmp/pdp-source/trench-long/{brown,blue,grey,black}.jpg
 *       tmp/pdp-source/trench-long/product-*.jpg · size-chart.jpg
 * Usage: npx tsx scripts/build-trench-long-coupang.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "womens-long-suede-trench-coat";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/pdp-source/trench-long";
const PUBLIC = "public/pdp/cjyd2717187-trench-long";

export const TITLE = "롱 스웨이드 트렌치코트";
export const COUPANG_NAME = `LEXI 여성 ${TITLE}`;
const TITLE_INTERNAL = "Women's Long Trench Coat - Casual Loose Fit Fall Winter Outerwear";

const CAST = {
  name: "김서윤 · Kim Seoyun",
  gender: "여성",
  nationality: "대한민국",
  interests: ["하이패션", "에디토리얼", "런웨이"],
};

const COLORS = [
  { ko: "다크브라운", en: "DARK BROWN", hero: "hero-brown.jpg", product: "product-brown.jpg", src: "brown", productSrc: "product-brown" },
  { ko: "사파이어블루", en: "SAPPHIRE BLUE", hero: "hero-blue.jpg", product: "product-blue.jpg", src: "blue", productSrc: "product-blue" },
  { ko: "그레이", en: "GREY", hero: "hero-grey.jpg", product: "product-grey.jpg", src: "grey", productSrc: "product-grey" },
  { ko: "블랙", en: "BLACK", hero: "hero-black.jpg", product: "product-black.jpg", src: "black", productSrc: "product-black" },
];

const SIZE = [
  { s: "S", bust: 90, len: 110, sleeve: 60 },
  { s: "M", bust: 95, len: 111, sleeve: 61 },
  { s: "L", bust: 100, len: 112, sleeve: 62 },
  { s: "XL", bust: 105, len: 113, sleeve: 63 },
  { s: "XXL", bust: 110, len: 114, sleeve: 64 },
  { s: "XXXL", bust: 115, len: 115, sleeve: 65 },
];
const SIZE_LABELS = ["XS", ...SIZE.map((r) => r.s)];

const COPY = {
  subtitle: "다크브라운·사파이어블루·그레이·블랙 4가지 컬러 중 원하는 1벌",
  lead: "스웨이드 텍스처의 롱 트렌치코트입니다. 노치드 라펠, 앞 버튼, 사이드 포켓, 커프스 스트랩이 있어 가을·겨울 데일리 아우터로 입기 좋습니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.",
  mood: "미들카프까지 내려오는 여유 있는 기장으로, 터틀넥과 데님 위에 걸치기만 해도 실루엣이 길게 정리됩니다. 매트한 스웨이드 텍스처가 캐주얼하면서도 단정한 인상을 줍니다.",
  styling: [
    "블랙 터틀넥과 데님에 앞을 열어 걸치면 주말 시티 산책에 맞는 이지 트렌치 룩이 됩니다.",
    "슬랙스와 부츠를 매치하고 단추를 채우면 출근·외출에도 부담 없는 롱 아우터 무드가 됩니다.",
    "사파이어블루는 뉴트럴 이너와, 다크브라운·블랙은 데님·블랙 팬츠와 맞추면 정돈된 인상을 줍니다.",
  ],
  faq: [
    { q: "네 가지 컬러가 함께 오나요?", a: "아닙니다. 다크브라운·사파이어블루·그레이·블랙은 각각 별도의 옵션입니다. 선택하신 컬러·사이즈의 코트 1벌만 배송됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈 기준의 루즈핏입니다. 하단 사이즈 가이드의 가슴둘레·총장·소매를 참고해 주세요. 두 사이즈 사이라면 큰 사이즈를 권장합니다. 다크브라운은 XS도 선택할 수 있습니다." },
    { q: "스웨이드 원단인가요?", a: "스웨이드 느낌의 텍스처 원단입니다. 실제 소재·관리 방법은 제품 라벨을 확인해 주세요." },
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
  { file: "hero-brown.jpg", src: "brown", w: 900, h: 1200, webp: "assets/s1-hero-opt.webp" },
  { file: "hero-blue.jpg", src: "blue", w: 900, h: 1200, webp: "assets/s1-hero-blue-opt.webp" },
  { file: "hero-grey.jpg", src: "grey", w: 900, h: 1200 },
  { file: "hero-black.jpg", src: "black", w: 900, h: 1200 },
  { file: "look-brown-upper.jpg", src: "brown", crop: { left: 132, top: 40, width: 600, height: 600 }, w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "product-brown.jpg", src: "product-brown", w: 1000, h: 1000 },
  { file: "product-blue.jpg", src: "product-blue", w: 1000, h: 1000 },
  { file: "product-grey.jpg", src: "product-grey", w: 1000, h: 1000 },
  { file: "product-black.jpg", src: "product-black", w: 1000, h: 1000 },
  { file: "size-chart.jpg", src: "size-chart", w: 1000, h: 1000, fit: "inside", pad: true },
  { file: "og.jpg", src: "brown", crop: { left: 0, top: 90, width: 864, height: 454 }, w: 1200, h: 630, webp: "og-opt.webp" },
  { file: "coupang-main.jpg", src: "brown", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-brown.jpg", src: "brown", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-blue.jpg", src: "blue", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-black.jpg", src: "black", crop: { left: 48, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
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
  const sizesFor = (c: (typeof COLORS)[number]) => (c.ko === "다크브라운" ? SIZE_LABELS : SIZE.map((r) => r.s));
  const optRow = (c: (typeof COLORS)[number]) => `<tr>
    <td style="width:34%;padding:10px 10px 10px 0;vertical-align:middle"><div style="border-radius:10px;overflow:hidden">${img(c.hero, c.en)}</div></td>
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${c.ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">코트 1벌</span></p>
    <div>${sizesFor(c).map((s) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${s}</span>`).join("")}</div></td></tr>`;
  const colorCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:25%;padding:0 ${i === 3 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img(c.hero, c.en)}</div><p style="margin:12px 0 0;font-size:15px;font-weight:800;text-align:center">${c.ko}</p></td>`;
  const designCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:25%;padding:0 ${i === 3 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img(c.product, c.en)}</div><p style="margin:10px 0 0;font-size:13px;color:${T.fog};text-align:center">${c.ko}</p></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const sizeList = SIZE.map((r) => r.s).join(" · ");

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">WOMEN'S OUTER · FALL/WINTER</span>
</div>
${img("hero-brown.jpg", "Hero")}
${sec(`${kicker("LONG TRENCH")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("4컬러 택1")}${chip("XS ~ XXXL")}${chip("스웨이드 텍스처")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "코트 1벌")}${stat("컬러", "4종 택1")}${stat("핏", "루즈")}${stat("기장", "롱", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("네 가지 컬러는 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 코트 1벌이 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map(optRow).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 25개 옵션 · 다크브라운은 XS 포함 (${COLORS.map((c) => c.ko).join(" · ")} × ${sizeList})</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("길게 떨어지는 스웨이드 트렌치")}${lead(COPY.mood)}`)}
${img("look-brown-upper.jpg", "Brown look")}
${caption("DARK BROWN · CITY WALK")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 코트를 고르는 2가지 이유")}${lead("롱 기장과 스웨이드 텍스처로 가을·겨울 데일리 아우터를 완성합니다.")}`, T.paper, "56px 32px 0")}
${point("01", "미들카프 롱 기장", "무릎 아래로 내려오는 기장이 실루엣을 길게 정리해 줍니다.", "hero-brown.jpg", "LONG LENGTH")}
${point("02", "스웨이드 텍스처", "매트한 스웨이드 느낌의 원단으로 캐주얼하면서도 단정한 인상을 줍니다.", "product-brown.jpg", "SUEDE TEXTURE")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("네 가지 컬러, 원하는 1벌을 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>${COLORS.map(colorCell).join("")}</tr></table>`, T.cream)}
${img("hero-blue.jpg", "Blue look")}
${caption("SAPPHIRE BLUE · WEEKEND")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 코트만 촬영한 단독 컷입니다. 라펠, 버튼, 포켓, 커프스와 컬러감을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>${COLORS.map(designCell).join("")}</tr></table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", `XS(다크브라운) · ${sizeList}`)}${row("구성", "롱 트렌치코트 1벌")}${row("소재", "폴리에스터 (스웨이드 텍스처)")}${row("디테일", "노치드 라펠 · 앞 버튼 · 사이드 포켓 · 커프스 스트랩")}${row("핏", "루즈 · 릴렉스드")}${row("성별", "여성")}${row("시즌", "가을 · 겨울")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>`)}
${sec(`${kicker("MODEL CAST")}${h2("이 상품의 화보 모델")}
  <table style="width:100%;border-collapse:collapse">${row("이름", CAST.name)}${row("성별", CAST.gender)}${row("국적", CAST.nationality)}${row("관심사", CAST.interests.join(" · "))}${row("소속사", "AMBA (AI Ambassador)")}</table>`, T.cream)}
${sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <table style="width:100%;border-collapse:collapse;background:#fff;margin-bottom:8px">
    <tr>${th("사이즈")}${th("가슴")}${th("총장")}${th("소매")}</tr>
    ${SIZE.map((r) => `<tr>${td(r.s, true)}${td(r.bust)}${td(r.len)}${td(r.sleeve)}</tr>`).join("")}
  </table>
  <div style="border-radius:12px;overflow:hidden;background:#fff">${img("size-chart.jpg", "Size chart")}</div>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">단위 cm · 수작업 측정으로 1~3cm 오차가 있을 수 있습니다.<br/>아시아 사이즈로 일반 해외 브랜드보다 1~2 사이즈 작게 나옵니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", TITLE_INTERNAL)}${row("Package", "롱 트렌치코트 1벌")}${row("Fit", "루즈 · 여성")}${row("Color", `${colorList} 중 택1`)}${row("Size", `XS · ${sizeList}`)}${row("Season", "가을 · 겨울")}${row("Material", "폴리에스터 · 스웨이드 텍스처")}${row("Care", "세탁 전 제품 라벨의 관리 방법을 확인해 주세요")}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("STYLING")}${h2("이렇게 입어 보세요")}${look("CITY", COPY.styling[0]!)}${look("NEAT", COPY.styling[1]!)}${look("COLOR", COPY.styling[2]!)}`)}
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

if (process.argv[1]?.includes("build-trench-long-coupang")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
