/**
 * 쿠팡 상세페이지 v1 — 벨티드 소매 오버핏 트렌치코트 (코트 1벌 · 그레이/블랙/카키 택1 · S~L)
 * 입력: tmp/pdp-source/cjq-v1/{grey,black,khaki}.jpg            (AMBA 착용컷 768×1024)
 *       tmp/pdp-source/cjq-v1/product-{grey,black,khaki}.jpg    (인물 없는 실물 단독컷 800×800)
 * 출력: pdp-site/<slug>/coupang/v1/* (jpg + detail-fragment.html + index.html)
 *       pdp-site/<slug>/{index.html, og-opt.webp, assets/*-opt.webp}
 * Usage: npx tsx scripts/build-cjq-trench-coupang.ts
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "womens-belted-cuff-trench-coat";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/pdp-source/cjq-v1";

export const TITLE = "벨티드 소매 오버핏 트렌치코트";
export const COUPANG_NAME = `LEXI 여성 ${TITLE}`;
const TITLE_INTERNAL = "New Women's Loose Mid-length Trench Coat";

const CAST = {
  name: "정수아 · Jung Sua",
  gender: "여성",
  nationality: "대한민국",
  interests: ["아웃도어", "여행", "자연광"],
};

const COLORS = [
  { ko: "그레이", en: "GREY", hero: "hero-grey.jpg", product: "product-grey.jpg" },
  { ko: "블랙", en: "BLACK", hero: "hero-black.jpg", product: "product-black.jpg" },
  { ko: "카키", en: "KHAKI", hero: "hero-khaki.jpg", product: "product-khaki.jpg" },
];
const SIZE = [
  { s: "S", len: 107, sleeve: 52.8, cuff: 31.8, chest: 108.6 },
  { s: "M", len: 108, sleeve: 53.8, cuff: 33.8, chest: 112.6 },
  { s: "L", len: 109, sleeve: 54.8, cuff: 35.8, chest: 116.6 },
];

const COPY = {
  subtitle: "그레이·블랙·카키 3가지 컬러 중 원하는 1벌",
  lead: "넓게 젖힌 노치드 라펠과 견장, 버클 스트랩 소매를 갖춘 오버핏 미디 트렌치코트입니다. 구성은 코트 1벌이며, 컬러와 사이즈를 하나씩 골라 주문하시면 됩니다.",
  mood: "어깨에서 자연스럽게 떨어지는 오버핏에 무릎 아래까지 내려오는 미디 기장으로, 앞을 열어 걸치기만 해도 실루엣이 길게 정리됩니다. 소매 끝 버클 스트랩이 클래식 트렌치의 디테일을 살리면서 손목 라인을 단정하게 잡아 줍니다.",
  styling: [
    "니트와 와이드 슬랙스 위에 앞을 열어 걸치면 출근길에도 부담 없는 미니멀 룩이 완성됩니다.",
    "화이트 데님과 로퍼를 매치해 은행잎 길 산책에 어울리는 가벼운 주말 코디로 입어 보세요.",
    "소매 스트랩을 조이고 라펠을 세우면 단정한 클래식 트렌치 무드로 연출할 수 있습니다.",
  ],
  faq: [
    { q: "세 가지 컬러가 함께 오나요?", a: "아닙니다. 그레이·블랙·카키는 각각 별도의 옵션입니다. 주문 시 선택하신 컬러·사이즈의 코트 1벌이 배송됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈 기준이며 여유 있는 오버핏으로 제작되었습니다. 평소 사이즈를 기준으로 하단 사이즈 가이드의 가슴둘레·소매길이를 비교해 선택해 주세요." },
    { q: "소매 스트랩은 조절되나요?", a: "소매 끝 스트랩을 버클에 끼워 원하는 둘레로 조여 착용할 수 있습니다." },
    { q: "세탁은 어떻게 하나요?", a: "세탁 전 제품 안쪽 라벨의 관리 방법을 확인해 주세요." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품으로 교환·반품 시 해외배송 왕복비용 48,000원이 공제됩니다. 제품 하자의 경우 절반을 판매자가 부담하여 24,000원이 공제됩니다." },
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = { file: string; src: string; crop?: Crop; w: number; h: number; webp?: string };

// 착용컷 768×1024, 실물컷 800×800 기준 좌표
const SHOTS: Shot[] = [
  { file: "hero-khaki.jpg", src: "khaki", w: 900, h: 1200, webp: "assets/s1-hero-opt.webp" },
  { file: "hero-grey.jpg", src: "grey", w: 900, h: 1200, webp: "assets/s1-hero-grey-opt.webp" },
  { file: "hero-black.jpg", src: "black", w: 900, h: 1200, webp: "assets/s1-hero-black-opt.webp" },
  { file: "look-khaki-upper.jpg", src: "khaki", crop: { left: 144, top: 40, width: 480, height: 480 }, w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "product-khaki.jpg", src: "product-khaki", w: 1000, h: 1000 },
  { file: "product-grey.jpg", src: "product-grey", w: 1000, h: 1000 },
  { file: "product-black.jpg", src: "product-black", w: 1000, h: 1000 },
  { file: "detail-collar.jpg", src: "product-khaki", crop: { left: 270, top: 30, width: 260, height: 260 }, w: 720, h: 720, webp: "assets/s2-detail-opt.webp" },
  { file: "detail-cuff.jpg", src: "product-khaki", crop: { left: 430, top: 280, width: 200, height: 200 }, w: 720, h: 720 },
  { file: "detail-shoulder.jpg", src: "product-black", crop: { left: 250, top: 70, width: 200, height: 200 }, w: 720, h: 720 },
  { file: "og.jpg", src: "khaki", crop: { left: 0, top: 60, width: 768, height: 403 }, w: 1200, h: 630, webp: "og-opt.webp" },
  { file: "rep-khaki.jpg", src: "khaki", crop: { left: 0, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-grey.jpg", src: "grey", crop: { left: 0, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
  { file: "rep-black.jpg", src: "black", crop: { left: 0, top: 0, width: 768, height: 768 }, w: 1000, h: 1000 },
];

async function images() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(`${DIR}/assets`, { recursive: true });
  for (const s of SHOTS) {
    let img = sharp(`${SRC}/${s.src}.jpg`);
    if (s.crop) img = img.extract(s.crop);
    const buf = await img.resize(s.w, s.h, { fit: "cover", position: "north" }).toBuffer();
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
  const th = (t: string) => `<th style="padding:12px 6px;background:${T.ink};color:#fff;font-size:14px;font-weight:700">${t}</th>`;
  const td = (t: string | number, b = false) => `<td style="padding:12px 6px;border-bottom:1px solid ${T.line};text-align:center;font-size:15px;color:${T.ink};${b ? "font-weight:800" : ""}">${t}</td>`;
  const look = (tag: string, text: string) => `<div style="margin:0 0 10px;padding:16px 18px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${T.accent};letter-spacing:0.12em">${tag}</p><p style="margin:0;font-size:15px;line-height:1.6;color:${T.ink}">${esc(text)}</p></div>`;
  const optRow = (c: (typeof COLORS)[number]) => `<tr>
    <td style="width:34%;padding:10px 10px 10px 0;vertical-align:middle"><div style="border-radius:10px;overflow:hidden">${img(c.hero, c.en)}</div></td>
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${c.ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">코트 1벌</span></p>
    <div>${SIZE.map((r) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${r.s}</span>`).join("")}</div></td></tr>`;
  const colorCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:33.33%;padding:0 ${i === 2 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img(c.hero, c.en)}</div><p style="margin:12px 0 0;font-size:17px;font-weight:800;text-align:center">${c.ko}</p></td>`;
  const designCell = (c: (typeof COLORS)[number], i: number) => `<td style="width:33.33%;padding:0 ${i === 2 ? 0 : 4}px 0 ${i === 0 ? 0 : 4}px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img(c.product, c.en)}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">${c.ko}</p></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const sizeList = SIZE.map((r) => r.s).join(" · ");

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">WOMEN'S OUTERWEAR · SPRING/FALL</span>
</div>
${img("hero-khaki.jpg", "Hero")}
${sec(`${kicker("GINKGO AVENUE EDIT")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("그레이 · 블랙 · 카키 택1")}${chip("S ~ L")}${chip("구성: 코트 1벌")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "코트 1벌")}${stat("컬러", "3종 택1")}${stat("총장", "107~109cm")}${stat("사이즈", "S ~ L", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("그레이·블랙·카키는 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 코트 1벌이 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map(optRow).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 ${COLORS.length * SIZE.length}개 옵션 (${COLORS.map((c) => c.ko).join(" · ")} × ${sizeList})</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("걸치기만 해도 길게 떨어지는 오버핏 미디 트렌치")}${lead(COPY.mood)}`)}
${img("look-khaki-upper.jpg", "Khaki look")}
${caption("KHAKI · GINKGO AVENUE")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 코트를 고르는 4가지 이유")}${lead("클래식 트렌치의 디테일을 오버핏 실루엣에 담았습니다.")}`, T.paper, "56px 32px 0")}
${point("01", "와이드 노치드 라펠", "넓게 젖힌 노치드 라펠이 얼굴 주변을 시원하게 열어 주고, 앞을 열어 입어도 라인이 흐트러지지 않습니다.", "detail-collar.jpg", "WIDE LAPEL")}
${point("02", "버클 스트랩 소매", "소매 끝 스트랩을 버클에 끼워 둘레를 조절할 수 있습니다. 조이면 단정하게, 풀어 늘어뜨리면 여유 있게 연출됩니다.", "detail-cuff.jpg", "BUCKLE CUFF")}
${point("03", "견장 & 드롭 숄더", "어깨 견장이 클래식 트렌치의 인상을 더하고, 자연스럽게 떨어지는 어깨 라인이 오버핏 실루엣을 편안하게 만들어 줍니다.", "detail-shoulder.jpg", "EPAULETTE")}
${point("04", "무릎 아래 미디 기장", "총장 107~109cm로 무릎 아래까지 내려오는 미디 기장입니다. 와이드 팬츠나 스커트 위에 걸쳐도 비율이 길게 정리됩니다.", "hero-grey.jpg", "MIDI LENGTH")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("세 가지 컬러, 원하는 1벌을 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>${COLORS.map(colorCell).join("")}</tr></table>`, T.cream)}
${img("hero-black.jpg", "Black look")}
${caption("BLACK · EVENING STREET")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 코트만 촬영한 단독 컷입니다. 노치드 라펠, 어깨 견장, 버클 스트랩 소매와 미디 기장을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>${COLORS.map(designCell).join("")}</tr></table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", sizeList)}${row("소재", "합성섬유")}${row("칼라", "노치드 라펠")}${row("여밈", "더블 브레스티드")}${row("소매", "긴소매 · 버클 스트랩")}${row("기장", "미디 (총장 107~109cm)")}${row("성별", "여성")}${row("구성", "코트 1벌")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>`)}
${sec(`${kicker("REAL DETAIL")}${h2("실물 디테일")}${lead("라펠, 소매 버클, 어깨 견장을 가까이에서 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>
    <td style="width:33.33%;padding:0 4px 0 0;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-collar.jpg", "Lapel")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">라펠</p></td>
    <td style="width:33.33%;padding:0 4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-cuff.jpg", "Cuff")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">소매 버클</p></td>
    <td style="width:33.33%;padding:0 0 0 4px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-shoulder.jpg", "Epaulette")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">어깨 견장</p></td>
  </tr></table>`)}
${sec(`${kicker("MODEL CAST")}${h2("이 상품의 화보 모델")}
  <table style="width:100%;border-collapse:collapse">${row("이름", CAST.name)}${row("성별", CAST.gender)}${row("국적", CAST.nationality)}${row("관심사", CAST.interests.join(" · "))}${row("소속사", "AMBA (AI Ambassador)")}</table>`, T.cream)}
${sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
    <tr>${th("사이즈")}${th("총장")}${th("소매길이")}${th("소매둘레")}${th("가슴둘레")}</tr>
    ${SIZE.map((r) => `<tr>${td(r.s, true)}${td(r.len)}${td(r.sleeve)}${td(r.cuff)}${td(r.chest)}</tr>`).join("")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">단위 cm · 수작업 측정으로 2~3cm 오차가 있을 수 있습니다.<br/>아시아 사이즈 기준의 여유 있는 오버핏입니다. 가슴둘레와 소매길이를 평소 입는 코트와 비교해 선택해 주세요.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", TITLE_INTERNAL)}${row("Package", "코트 1벌")}${row("Fit", "오버핏 · 미디 기장(총장 107~109cm) · 여성")}${row("Color", `${colorList} 중 택1`)}${row("Size", sizeList)}${row("Season", "봄 · 가을 간절기")}${row("Material", "합성섬유")}${row("Care", "세탁 전 제품 라벨의 관리 방법을 확인해 주세요")}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("STYLING")}${h2("이렇게 입어 보세요")}${look("CITY", COPY.styling[0]!)}${look("WEEKEND", COPY.styling[1]!)}${look("CLASSIC", COPY.styling[2]!)}`)}
${sec(`${kicker("FAQ")}${h2("구매 전 확인해 주세요")}
  ${COPY.faq.map((f) => `<div style="margin:0 0 12px;padding:16px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 6px;font-size:16px;font-weight:800">Q. ${esc(f.q)}</p><p style="margin:0;font-size:15px;line-height:1.7;color:${T.fog}">${esc(f.a)}</p></div>`).join("")}`, T.cream)}
${sec(`${kicker("SHIPPING")}${h2("배송 · 교환 · 반품 안내")}
  <div style="margin:0 0 18px;padding:18px 18px 16px;background:#fff;border:2px solid ${T.ink};border-radius:12px">
    <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:${T.ink}">필독 · 교환/반품 비용 (해외배송 왕복비용) <span style="white-space:nowrap">48,000원</span></p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:${T.ink}">- 이 상품은 해외배송 상품이므로, 반품비용이 해외택배 기준으로 발생하여 공제되므로 구매 시 반드시 참고 바랍니다. 단순 변심 등 무분별한 구매를 삼가 주시기를 부탁드립니다.</p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:${T.ink}">- 다만 제품의 하자가 있는 경우에는 절반을 판매자가 부담하여 <strong>24,000원</strong> 반품비용이 공제됩니다.</p>
  </div>
  <table style="width:100%;border-collapse:collapse">
  ${row("배송방법", "순차배송 · 한진택배")}
  ${row("배송비", "무료배송")}
  ${row("배송기간", "LEXI 소싱 해외배송 · 결제 후 영업일 기준 7~14일 도착")}
  ${row("도서산간", "배송이 제한되거나 일반 지역보다 3~5일 추가 소요될 수 있습니다")}
  ${row("통관", "해외배송 상품으로 수령인 개인통관고유부호가 필요할 수 있습니다")}
  ${row("교환·반품", "수령 후 7일 이내 접수 · 해외배송 왕복비용 48,000원 공제 (제품 하자 시 24,000원)")}
  ${row("반품 제한", "사용 흔적, 세탁, 택·라벨 훼손, 구성품 누락 등으로 상품 가치가 감소한 경우 교환·반품이 제한될 수 있습니다")}
  ${row("유의", "모니터 환경에 따라 실제 색상과 다소 차이가 있을 수 있습니다")}
  </table>
  <p style="margin:18px 0 0;font-size:13px;line-height:1.75;color:${T.fog}">상품의 내용이 표시·광고와 다른 경우에는 관계 법령과 쿠팡 정책이 우선 적용됩니다.</p>`)}
<p style="margin:0;padding:22px 32px;text-align:center;font-size:13px;color:${T.fog}">LEXI Curated · 해외배송 · © LEXI</p>
</div>`;
}

function page(frag: string, ogPath: string, name = TITLE) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(name)} · LEXI</title>
<meta name="description" content="${esc(COPY.subtitle)}"/>
<meta property="og:title" content="${esc(name)} · LEXI"/>
<meta property="og:description" content="${esc(COPY.subtitle)}"/>
<meta property="og:image" content="${ogPath}"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"/>
<style>:root{word-break:keep-all}body{margin:0;background:#ebe6dc}h1,h2,h3{text-wrap:balance}</style>
</head><body>${frag}</body></html>`;
}

const PREVIEW = "public/coupang-preview/CJQB156210006FU";

/** 쿠팡에 넣을 상세를 로컬에서 눈으로 확인할 수 있게, 참조 이미지까지 같은 폴더로 복사해 미리보기 페이지를 만든다. */
function preview() {
  const frag = readFileSync(`${OUT}/detail-fragment.html`, "utf8");
  const refs = [...new Set([...frag.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]!))];
  mkdirSync(PREVIEW, { recursive: true });
  let html = frag;
  for (const src of refs) {
    const file = src.slice(src.lastIndexOf("/") + 1);
    copyFileSync(`${OUT}/${file}`, `${PREVIEW}/${file}`);
    html = html.split(src).join(`./${file}`);
  }
  writeFileSync(`${PREVIEW}/detail-fragment.html`, html, "utf8");
  writeFileSync(`${PREVIEW}/index.html`, page(html, `${BASE}/og.jpg`, COUPANG_NAME), "utf8");
  console.log("preview", refs.length, "images →", PREVIEW);
}

async function main() {
  if (process.argv.includes("--preview-only")) {
    preview();
    return;
  }
  await images();
  const frag = fragment();
  writeFileSync(`${OUT}/detail-fragment.html`, frag, "utf8");
  writeFileSync(`${OUT}/index.html`, page(frag, `${BASE}/og.jpg`), "utf8");
  writeFileSync(`${DIR}/index.html`, page(frag, `${SITE}/${SLUG}/og-opt.webp`), "utf8");
  preview();
  console.log("built", SHOTS.length, "images", frag.length, "chars");
}

if (process.argv[1]?.includes("build-cjq-trench-coupang")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
