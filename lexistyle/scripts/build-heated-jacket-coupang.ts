/**
 * 쿠팡 상세페이지 v1 — 남성 9존 스마트 온열 자켓 (CJFY3221007)
 * 자켓 1벌 + 20,000mAh 보조배터리 · 3컬러 택1 · S~5XL
 * Usage: npx tsx scripts/build-heated-jacket-coupang.ts
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SLUG = "mens-9-zone-heated-jacket";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v1`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v1`;
const SRC = "tmp/coupang/heated-jacket/img";
const PUBLIC = "public/pdp/cjfy3221007-heated-jacket";
const PREVIEW = "public/coupang-preview/CJFY3221007";

export const TITLE = "9존 스마트 온열 자켓";
export const COUPANG_NAME = `LEXI 남성 ${TITLE} 방수 겨울 아우터`;
const TITLE_INTERNAL = "9 Zone Smart Heated Jacket Waterproof Winter Coat";

const COLORS = [
  { ko: "블랙", en: "BLACK" },
  { ko: "네이비블루", en: "NAVY BLUE" },
  { ko: "아미그린", en: "ARMY GREEN" },
];

const SIZE_LABELS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

/** inch 사이즈표를 cm로 환산 (단면 실측, 오차 1~3cm) */
const SIZE_TABLE: [string, number, number, number, number, number][] = [
  ["S", 69.1, 108.0, 104.9, 48.0, 58.9],
  ["M", 71.1, 110.0, 106.9, 49.0, 60.5],
  ["L", 72.9, 114.0, 111.0, 50.0, 62.0],
  ["XL", 74.9, 118.1, 115.1, 52.1, 63.0],
  ["2XL", 77.0, 121.9, 119.1, 53.1, 64.0],
  ["3XL", 78.0, 126.0, 122.9, 54.1, 65.0],
  ["4XL", 79.0, 130.0, 127.0, 55.1, 66.0],
  ["5XL", 80.0, 134.1, 131.1, 55.9, 67.1],
];

const COPY = {
  subtitle: "블랙·네이비블루·아미그린 3가지 컬러 중 원하는 1벌",
  lead: "목·배·등·허리를 감싸는 9개 발열 존, 앞뒤 듀얼 스위치, 3단 온도 조절(39·45·55°C)을 갖춘 스마트 온열 자켓입니다. 20,000mAh 보조배터리가 함께 오며, 생활 방수 원단과 탈부착 방풍 후드로 겨울 아웃도어와 출퇴근에 맞습니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.",
  mood: "두꺼운 레이어드 대신 보조배터리 하나로 360° 온기를 채우는 방식입니다. 스키·등산·라이딩처럼 찬 바람을 맞는 야외 활동과 새벽 출퇴근길에 특히 잘 맞습니다.",
  zones: [
    "목 1곳 — 경추를 감싸 찬 바람을 막아 줍니다.",
    "배 2곳 — 배꼽 주변을 부드럽게 데워 줍니다.",
    "등 4곳 — 냉기로 굳는 등을 넓게 풀어 줍니다.",
    "허리 2곳 — 아래 허리를 시린 바람에서 지켜 줍니다.",
  ],
  temp: [
    { color: "레드", temp: "약 55°C", note: "강추위 · 설상 스포츠" },
    { color: "화이트", temp: "약 45°C", note: "야외 산책 · 출퇴근" },
    { color: "블루", temp: "약 39°C", note: "실내 · 배터리 절약" },
  ],
  steps: [
    "안쪽 포켓의 USB 케이블을 20,000mAh 보조배터리에 연결합니다.",
    "가슴 스위치를 2~3초 길게 눌러 전원을 켭니다.",
    "스위치를 짧게 눌러 레드·화이트·블루 3단 온도를 조절합니다.",
  ],
  scene: [
    { tag: "COMMUTE", text: "출퇴근 · 데일리 — 기모 안감과 9존 온열로 한파에도 두껍게 껴입지 않아도 됩니다." },
    { tag: "MOUNTAIN", text: "등산 · 스키 · 라이딩 — 방수 원단과 탈부착 방풍 후드가 눈·비·바람을 막아 줍니다." },
    { tag: "FISHING", text: "낚시 · 캠핑 — 오래 서 있거나 앉아 있는 야외 일정에서 1~3단 온도로 버팁니다." },
  ],
  faq: [
    { q: "보조배터리가 포함되어 있나요?", a: "네. 20,000mAh 보조배터리 1개가 함께 배송됩니다. 자켓 안쪽 포켓의 USB 케이블에 연결해 사용해 주세요." },
    { q: "발열 온도와 조절은 어떻게 되나요?", a: "레드(약 55°C)·화이트(약 45°C)·블루(약 39°C) 3단계입니다. 앞뒤 스위치로 독립 조절되며, 스위치를 2~3초 길게 누르면 바로 발열이 시작됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "S~5XL 아시아 사이즈 기준입니다. 하단 사이즈 가이드의 실측 표를 확인해 주세요. 두 사이즈 사이라면 큰 사이즈를 권장합니다." },
    { q: "세탁은 어떻게 하나요?", a: "세탁 전 제품 안쪽 라벨의 관리 방법을 확인해 주세요. 보조배터리와 USB 케이블은 반드시 분리한 뒤 세탁해 주세요." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품으로 교환·반품 시 해외배송 왕복비용 48,000원이 공제됩니다. 제품 하자의 경우 절반을 판매자가 부담하여 24,000원이 공제됩니다." },
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = { file: string; src: string; crop?: Crop; w: number; h: number; fit?: "cover" | "contain" };

// TODO(SHOTS): 콘택트시트 확인 후 채운다
const SHOTS: Shot[] = [
  { file: "hero-black.jpg", src: "cj02.jpg", w: 900, h: 1200, fit: "contain" },
  { file: "hero-navy-blue.jpg", src: "cj10.jpg", w: 900, h: 1200 },
  { file: "hero-army-green.jpg", src: "cj03.jpg", w: 900, h: 1200, fit: "contain" },
  { file: "look-walk.jpg", src: "cj10.jpg", crop: { left: 0, top: 0, width: 800, height: 620 }, w: 1600, h: 1000 },
  { file: "product-black.jpg", src: "cj02.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "product-navy-blue.jpg", src: "cj13.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "product-army-green.jpg", src: "cj03.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "rep-black.jpg", src: "cj02.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "rep-navy-blue.jpg", src: "cj13.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "rep-army-green.jpg", src: "cj03.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "coupang-main.jpg", src: "cj02.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "og.jpg", src: "cj10.jpg", w: 1200, h: 630 },
  { file: "zone-full.jpg", src: "cj05.png", w: 1000, h: 1000, fit: "contain" },
  { file: "zone-a.jpg", src: "cj06.png", w: 1000, h: 1000, fit: "contain" },
  { file: "zone-b.jpg", src: "cj07.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "tech.jpg", src: "cj04.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "dual.jpg", src: "cj08.jpg", w: 1000, h: 1000, fit: "contain" },
  { file: "detail-hood.jpg", src: "cj00.jpg", crop: { left: 150, top: 0, width: 500, height: 500 }, w: 1000, h: 1000 },
  { file: "detail-zipper.jpg", src: "cj02.jpg", crop: { left: 300, top: 280, width: 420, height: 420 }, w: 1000, h: 1000 },
  { file: "detail-fabric.jpg", src: "cj03.jpg", crop: { left: 150, top: 480, width: 420, height: 420 }, w: 1000, h: 1000 },
];

async function images() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUBLIC, { recursive: true });
  mkdirSync(PREVIEW, { recursive: true });
  for (const s of SHOTS) {
    const source = `${SRC}/${s.src}`;
    const meta = await sharp(source).metadata();
    let pipeline = sharp(source);
    if (s.crop) {
      const left = Math.min(s.crop.left, Math.max(0, (meta.width ?? 0) - s.crop.width));
      const top = Math.min(s.crop.top, Math.max(0, (meta.height ?? 0) - s.crop.height));
      const width = Math.min(s.crop.width, (meta.width ?? s.crop.width) - left);
      const height = Math.min(s.crop.height, (meta.height ?? s.crop.height) - top);
      pipeline = pipeline.extract({ left, top, width, height });
    }
    const buf = await pipeline
      .resize(s.w, s.h, { fit: s.fit ?? "cover", position: "north", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .toBuffer();
    const jpg = await sharp(buf).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    writeFileSync(`${OUT}/${s.file}`, jpg);
    writeFileSync(`${PUBLIC}/${s.file}`, jpg);
    writeFileSync(`${PREVIEW}/${s.file}`, jpg);
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const T = { ink: "#1a1a1a", paper: "#faf9f7", cream: "#ebe6dc", line: "#e8e4dc", fog: "#6e6e73", accent: "#e85d4c" };
const font = "font-family:Pretendard,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";
let PB = BASE;
const img = (f: string, alt = "") => `<img src="${PB}/${f}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;margin:0;border:0"/>`;
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
  const thc = (t: string) => `<th style="padding:12px 4px;background:${T.ink};color:#fff;font-size:13px;font-weight:700">${t}</th>`;
  const tdc = (t: string | number, b = false) => `<td style="padding:11px 4px;border-bottom:1px solid ${T.line};text-align:center;font-size:13.5px;color:${T.ink};${b ? "font-weight:800" : ""}">${t}</td>`;
  const scene = (tag: string, text: string) => `<div style="margin:0 0 10px;padding:16px 18px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${T.accent};letter-spacing:0.12em">${tag}</p><p style="margin:0;font-size:15px;line-height:1.6;color:${T.ink}">${esc(text)}</p></div>`;
  const optRow = (heroFile: string, ko: string, en: string) => `<tr>
    <td style="width:34%;padding:10px 10px 10px 0;vertical-align:middle"><div style="border-radius:10px;overflow:hidden">${img(heroFile, en)}</div></td>
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${ko} <span style="font-size:14px;font-weight:600;color:${T.fog}">자켓 1벌 + 보조배터리</span></p>
    <div>${SIZE_LABELS.map((s) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${s}</span>`).join("")}</div></td></tr>`;
  const colorCell = (heroFile: string, ko: string) => `<td style="width:33.3%;padding:0 4px;vertical-align:top"><div style="border-radius:12px;overflow:hidden">${img(heroFile, ko)}</div><p style="margin:10px 0 0;font-size:13px;font-weight:800;text-align:center">${ko}</p></td>`;
  const designCell = (file: string, ko: string) => `<td style="width:33.3%;padding:0 4px;vertical-align:top"><div style="border-radius:12px;overflow:hidden;background:#fff">${img(file, ko)}</div><p style="margin:8px 0 0;font-size:12px;color:${T.fog};text-align:center">${ko}</p></td>`;
  const tempBox = (color: string, temp: string, note: string) => `<td style="width:33.3%;padding:4px"><div style="background:#fff;border:1px solid ${T.line};border-radius:12px;padding:16px 8px;text-align:center"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${T.fog}">${color}</p><p style="margin:0 0 4px;font-size:20px;font-weight:900">${temp}</p><p style="margin:0;font-size:12px;color:${T.fog}">${note}</p></div></td>`;
  const colorList = COLORS.map((c) => c.ko).join(" / ");
  const sizeList = SIZE_LABELS.join(" · ");
  const heroFor = (en: string) => `hero-${en.toLowerCase().replace(/ /g, "-")}.jpg`;
  const productFor = (en: string) => `product-${en.toLowerCase().replace(/ /g, "-")}.jpg`;

  const parts: string[] = [];
  parts.push(`<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">MEN'S OUTERWEAR · WINTER</span>
</div>`);
  parts.push(img("hero-navy-blue.jpg", "Navy look"));
  parts.push(sec(`${kicker("9 ZONES · DUAL CONTROL")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("3컬러 택1")}${chip("S ~ 5XL")}${chip("9개 발열 존")}${chip("20,000mAh 보조배터리 포함")}</div>`, T.paper, "40px 32px 32px"));
  parts.push(`<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "자켓+배터리")}${stat("컬러", "3종 택1")}${stat("발열", "9개 존")}${stat("사이즈", "S ~ 5XL", true)}
  </tr></table>
</div>`);
  parts.push(sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("세 컬러는 각각 별도의 옵션입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 자켓 1벌과 20,000mAh 보조배터리 1개가 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${COLORS.map((c) => optRow(heroFor(c.en), c.ko, c.en)).join("")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 24개 옵션 (${colorList} × ${sizeList})</p>`, T.cream));
  parts.push(sec(`${kicker("MOOD")}${h2("보조배터리 하나로 채우는 360° 온기")}${lead(COPY.mood)}`));
  parts.push(img("look-walk.jpg", "Winter outdoor look"));
  parts.push(caption("WINTER OUTDOOR · 9 ZONES"));
  parts.push(sec(`${kicker("CHECK POINT")}${h2("겨울을 바꾸는 4가지")}${lead("무겁게 껴입는 대신, 발열과 방수로 겨울을 정면으로 다룹니다.")}`, T.paper, "56px 32px 0"));
  parts.push(point("01", "9개 발열 존", "목 1곳, 배 2곳, 등 4곳, 허리 2곳 — 찬 공기에 먼저 굳는 부위를 골라 데웁니다. " + COPY.zones.join(" "), "zone-full.jpg", "9 HEATING ZONES"));
  parts.push(point("02", "앞뒤 듀얼 스위치 · 3단 온도", "가슴과 등 스위치로 앞뒤를 따로 조절합니다. 2~3초 길게 누르면 바로 발열되고, 짧게 누르면 3단 온도가 바뀝니다.", "dual.jpg", "DUAL CONTROL"));
  parts.push(point("03", "눈·비를 막는 방수 원단", "연꽃잎처럼 물을 튕겨내는 고밀도 방수 원단이 눈·비·바람을 막고, 안쪽은 마른 상태를 유지합니다.", "tech.jpg", "WATERPROOF FABRIC"));
  parts.push(point("04", "탈부착 방풍 후드 · 카본 발열", "목을 세우는 방풍 후드는 지퍼로 분리됩니다. 머리카락처럼 가는 카본파이버 발열선이 빠르고 고르게 데웁니다.", "detail-hood.jpg", "DETACHABLE HOOD"));
  parts.push(`<div style="height:56px;background:${T.paper}"></div>`);
  parts.push(sec(`${kicker("TEMPERATURE")}${h2("세 단계 온도, 상황에 맞게")}${lead("스위치를 짧게 눌러 단계를 바꿉니다. 앞뒤 독립 조절로 배는 약하게, 등은 강하게 같은 운용도 가능합니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:16px"><tr>${COPY.temp.map((t) => tempBox(t.color, t.temp, t.note)).join("")}</tr></table>`, T.cream));
  parts.push(sec(`${kicker("ZONE MAP")}${h2("어디가 따뜻해지는지 한눈에")}
  <div style="border-radius:16px;overflow:hidden;background:#fff;margin-bottom:12px">${img("zone-a.jpg", "Neck & abdomen zones")}</div>
  <div style="border-radius:16px;overflow:hidden;background:#fff">${img("zone-b.jpg", "Back & waist zones")}</div>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">목 1곳 · 배 2곳 · 등 4곳 · 허리 2곳, 총 9개 존이 전신을 나눠 데웁니다.</p>`, T.paper));
  parts.push(sec(`${kicker("COLOR")}${h2("세 가지 컬러, 원하는 1벌을 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>${COLORS.map((c) => colorCell(heroFor(c.en), c.ko)).join("")}</tr></table>`, T.cream));
  parts.push(sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 자켓만 촬영한 단독 컷입니다. 후드 형태, 포켓, 카라와 컬러감을 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>${COLORS.map((c) => designCell(productFor(c.en), c.ko)).join("")}</tr></table>`, T.cream));
  parts.push(sec(`${kicker("HOW TO USE")}${h2("3단계로 바로 사용")}
  ${COPY.steps.map((s, i) => `<div style="margin:0 0 10px;padding:16px 18px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${T.accent};letter-spacing:0.12em">STEP ${i + 1}</p><p style="margin:0;font-size:15px;line-height:1.6;color:${T.ink}">${esc(s)}</p></div>`).join("")}
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">발열이 시작되면 앞뒤 스위치 표시등으로 현재 단계(레드·화이트·블루)를 확인할 수 있습니다.</p>`, T.paper));
  parts.push(sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", `${colorList} (택1)`)}${row("사이즈", sizeList)}${row("구성", "자켓 1벌 + 20,000mAh 보조배터리 1개")}${row("발열", "9개 존 (목 1 · 배 2 · 등 4 · 허리 2)")}${row("온도", "3단계 — 레드 약 55°C / 화이트 약 45°C / 블루 약 39°C (앞뒤 듀얼 스위치)")}${row("소재", "생활 방수 아우터 · 카본파이버 발열선 · 보온 안감")}${row("후드", "탈부착 방풍 후드")}${row("전원", "USB 연결 · 20,000mAh 보조배터리 포함")}${row("핏", "유니섹스 (남녀 공용)")}${row("무게", "약 1.3kg")}${row("시즌", "겨울")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`));
  parts.push(sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;background:#fff;min-width:520px">
    <tr>${thc("사이즈")}${thc("총장")}${thc("가슴단면")}${thc("밑단")}${thc("어깨")}${thc("소매")}</tr>
    ${SIZE_TABLE.map((r) => `<tr>${tdc(r[0], true)}${tdc(r[1])}${tdc(r[2])}${tdc(r[3])}${tdc(r[4])}${tdc(r[5])}</tr>`).join("")}
  </table></div>
  <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">단면 실측(cm) · 측정 방법에 따라 1~3cm 오차가 있을 수 있습니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다.</p>`, T.cream));
  parts.push(sec(`${kicker("SCENE")}${h2("이런 겨울에")}${COPY.scene.map((s) => scene(s.tag, s.text)).join("")}`, T.paper));
  parts.push(sec(`${kicker("DETAILS")}${h2("디테일")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>
    <td style="width:50%;padding:0 4px 0 0;vertical-align:top"><div style="border-radius:12px;overflow:hidden">${img("detail-zipper.jpg", "Zipper")}</div></td>
    <td style="width:50%;padding:0 0 0 4px;vertical-align:top"><div style="border-radius:12px;overflow:hidden">${img("detail-fabric.jpg", "Fabric finish")}</div></td>
  </tr></table>
  <p style="margin:10px 0 0;font-size:13px;color:${T.fog};text-align:center">지퍼 여밈 · 원단 마감</p>`, T.cream));
  parts.push(sec(`${kicker("FAQ")}${h2("구매 전 확인해 주세요")}
  ${COPY.faq.map((f) => `<div style="margin:0 0 12px;padding:16px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 6px;font-size:16px;font-weight:800">Q. ${esc(f.q)}</p><p style="margin:0;font-size:15px;line-height:1.7;color:${T.fog}">${esc(f.a)}</p></div>`).join("")}`, T.paper));
  parts.push(sec(`${kicker("SHIPPING")}${h2("배송 · 교환 · 반품 안내")}
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
  </table>`));
  parts.push(`<p style="margin:0;padding:22px 32px;text-align:center;font-size:13px;color:${T.fog}">LEXI Curated · 해외배송 · © LEXI</p>`);
  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">${parts.join("")}</div>`;
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
  PB = BASE;
  const fragAbs = fragment();
  writeFileSync(`${OUT}/detail-fragment.html`, fragAbs, "utf8");
  writeFileSync(`${OUT}/index.html`, page(fragAbs, `${BASE}/og.jpg`), "utf8");
  writeFileSync(`${DIR}/index.html`, page(fragAbs, `${BASE}/og.jpg`), "utf8");
  writeFileSync(`${PUBLIC}/detail-fragment.html`, fragAbs, "utf8");
  PB = ".";
  const fragRel = fragment();
  writeFileSync(`${PREVIEW}/index.html`, page(fragRel, `${BASE}/og.jpg`), "utf8");
  console.log("built", SHOTS.length, "images", fragAbs.length, "chars →", OUT, PUBLIC, PREVIEW);
}

main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
