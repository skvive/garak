/**
 * 쿠팡 상세페이지 v3 — 배색 후드 롱 트렌치코트 (코트 1벌 · 블랙/베이지 택1 · M~3XL)
 * 입력: tmp/pdp-source/v3/{black-front,black-bag,black-back,beige-front,beige-open}.jpg
 *       (원본 착용컷 5장을 얼굴·배경만 교체해 재생성한 1024² 이미지)
 *       pdp-site/<slug>/coupang/cj-09.jpg (인물 없는 실물 디테일 콜라주)
 * 출력: pdp-site/<slug>/coupang/v3/* (jpg + detail-fragment.html + index.html)
 *       pdp-site/<slug>/{index.html, og-opt.webp, assets/*-opt.webp}
 * Usage: npx tsx scripts/build-trench-coupang-v3.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { P } from "./gen-sample3-trench-pdp";

const SLUG = "mens-faux-two-piece-trench-coat";
const DIR = `pdp-site/${SLUG}`;
const OUT = `${DIR}/coupang/v3`;
const SITE = "https://pdp-site-five.vercel.app";
const BASE = `${SITE}/${SLUG}/coupang/v3`;
const SRC = "tmp/pdp-source/v3";

export const TITLE = "배색 후드 롱 트렌치코트";
export const COUPANG_NAME = `LEXI 남성 ${TITLE}`;

const CAST = {
  name: "오시온 · Oh Sion",
  gender: "남성",
  nationality: "대한민국",
  interests: ["스튜디오 라이트", "미니멀 스타일", "필름"],
};

const COLORS = ["블랙", "베이지"];
const SIZE = [
  { s: "M", len: 94, chest: 116, shoulder: 52, sleeve: 56 },
  { s: "L", len: 96, chest: 120, shoulder: 53.5, sleeve: 57 },
  { s: "XL", len: 98, chest: 124, shoulder: 55, sleeve: 58 },
  { s: "2XL", len: 100, chest: 128, shoulder: 56.5, sleeve: 59 },
  { s: "3XL", len: 102, chest: 132, shoulder: 58, sleeve: 60 },
];

const COPY = {
  subtitle: "블랙·베이지 2가지 디자인 중 원하는 컬러로 1벌",
  lead: "후드와 앞 여밈에 대비 컬러를 넣은 배색 디자인의 롱코트입니다. 구성은 코트 1벌이며, 블랙과 베이지 중 원하는 디자인과 사이즈를 골라 주문하시면 됩니다.",
  mood: "블랙 코트에는 베이지, 베이지 코트에는 블랙으로 후드와 앞 여밈을 배색했습니다. 안에 한 겹 더 입은 듯한 인상을 주지만, 실제로는 코트 1벌에 봉제된 일체형 디자인이라 따로 챙길 것 없이 걸치기만 하면 됩니다.",
  faq: [
    { q: "블랙과 베이지가 함께 오나요?", a: "아닙니다. 블랙과 베이지는 각각 별도의 디자인입니다. 주문 시 선택하신 컬러·사이즈의 코트 1벌이 배송됩니다." },
    { q: "사이즈는 어떻게 고르나요?", a: "아시아 사이즈로 일반 해외 브랜드보다 1~2 사이즈 작게 나옵니다. 두 사이즈 사이라면 큰 사이즈를 선택하시는 것을 권장합니다." },
    { q: "후드와 안쪽 배색 여밈은 분리되나요?", a: "후드와 안쪽 배색 여밈은 코트에 봉제된 일체형 디자인이라 분리되지 않습니다." },
    { q: "세탁은 어떻게 하나요?", a: "울 블렌드 소재로 드라이클리닝을 권장합니다. 보관 시에는 어깨 형태가 유지되는 옷걸이를 사용해 주세요." },
    P.copy.faq[3]!,
  ],
};

type Crop = { left: number; top: number; width: number; height: number };
type Shot = { file: string; src: string; crop?: Crop; w: number; h: number; webp?: string };

// 재생성 이미지 1024×1024 기준 좌표
const SHOTS: Shot[] = [
  { file: "black-front.jpg", src: "black-front", w: 1000, h: 1000, webp: "assets/s1-hero-opt.webp" },
  { file: "black-bag.jpg", src: "black-bag", w: 1000, h: 1000, webp: "assets/s3-desire-opt.webp" },
  { file: "black-back.jpg", src: "black-back", w: 1000, h: 1000 },
  { file: "beige-front.jpg", src: "beige-front", w: 1000, h: 1000, webp: "assets/s1-hero-apricot-opt.webp" },
  { file: "beige-open.jpg", src: "beige-open", w: 1000, h: 1000 },
  { file: "detail-hood-black.jpg", src: "black-front", crop: { left: 320, top: 250, width: 400, height: 400 }, w: 720, h: 720, webp: "assets/s2-detail-opt.webp" },
  { file: "detail-hood-beige.jpg", src: "beige-front", crop: { left: 340, top: 210, width: 360, height: 360 }, w: 720, h: 720 },
  { file: "detail-cuff-beige.jpg", src: "beige-front", crop: { left: 230, top: 440, width: 280, height: 280 }, w: 720, h: 720 },
  { file: "og.jpg", src: "black-front", crop: { left: 0, top: 40, width: 1024, height: 538 }, w: 1200, h: 630, webp: "og-opt.webp" },
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
  await sharp(`${DIR}/coupang/cj-09.jpg`).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/detail-real.jpg`);
  await sharp(`${SRC}/beige-detail.jpg`).resize(1000, 1000).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/detail-real-beige.jpg`);
  await sharp(`${DIR}/coupang/cj-05.jpg`).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/design-front.jpg`);
  await sharp(`${DIR}/coupang/cj-14.jpg`).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/design-side.jpg`);
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
  <div style="margin-top:24px;border-radius:16px;overflow:hidden">${img(file, en)}</div>
</div>`;
}

function fragment() {
  const chip = (t: string) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid ${T.line};font-size:14px;font-weight:700;color:${T.ink}">${esc(t)}</span>`;
  const stat = (k: string, v: string, last = false) => `<td style="width:25%;padding:18px 6px;text-align:center;${last ? "" : `border-right:1px solid ${T.line}`}"><p style="margin:0 0 6px;font-size:13px;color:${T.fog}">${k}</p><p style="margin:0;font-size:17px;font-weight:800;color:${T.ink};line-height:1.4">${v}</p></td>`;
  const row = (k: string, v: string) => `<tr><th style="width:32%;text-align:left;padding:12px 10px;border-bottom:1px solid ${T.line};font-size:14px;color:${T.fog};font-weight:600;vertical-align:top">${k}</th><td style="padding:12px 10px;border-bottom:1px solid ${T.line};font-size:15px;line-height:1.6;color:${T.ink}">${esc(v)}</td></tr>`;
  const th = (t: string) => `<th style="padding:12px 6px;background:${T.ink};color:#fff;font-size:14px;font-weight:700">${t}</th>`;
  const td = (t: string | number, b = false) => `<td style="padding:12px 6px;border-bottom:1px solid ${T.line};text-align:center;font-size:15px;color:${T.ink};${b ? "font-weight:800" : ""}">${t}</td>`;
  const look = (tag: string, text: string) => `<div style="margin:0 0 10px;padding:16px 18px;background:#fff;border:1px solid ${T.line};border-radius:12px"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${T.accent};letter-spacing:0.12em">${tag}</p><p style="margin:0;font-size:15px;line-height:1.6;color:${T.ink}">${esc(text)}</p></div>`;
  const [s1, s2, s3] = P.copy.styling;
  const optRow = (color: string, file: string) => `<tr>
    <td style="width:34%;padding:10px 10px 10px 0;vertical-align:middle"><div style="border-radius:10px;overflow:hidden">${img(file, color)}</div></td>
    <td style="padding:10px 0;vertical-align:middle"><p style="margin:0 0 8px;font-size:18px;font-weight:800">${color} <span style="font-size:14px;font-weight:600;color:${T.fog}">코트 1벌</span></p>
    <div>${SIZE.map((r) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;border:1px solid ${T.ink};font-size:14px;font-weight:700">${r.s}</span>`).join("")}</div></td></tr>`;

  return `<div class="lexi-pdp" style="max-width:780px;margin:0 auto;background:${T.paper};color:${T.ink};${font};font-size:16px;line-height:1.65;word-break:keep-all">
<div style="background:${T.ink};color:#fff;padding:10px 20px;text-align:center;font-size:14px;line-height:1.6">해외배송 상품입니다 · 구매 전 하단 <strong>배송·교환·반품 안내</strong>를 꼭 확인해 주세요</div>
<div style="padding:18px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${T.line}">
  <span style="font-size:20px;font-weight:900;letter-spacing:0.2em">LEXI<span style="color:${T.accent}">.</span></span>
  <span style="font-size:13px;color:${T.fog};letter-spacing:0.12em">MEN'S OUTERWEAR · F/W</span>
</div>
${img("beige-front.jpg", "Hero")}
${sec(`${kicker("AUTUMN STREET EDIT")}
  <h1 style="margin:0 0 10px;font-size:32px;line-height:1.35;font-weight:900;text-wrap:balance">${esc(TITLE)}</h1>
  <p style="margin:0 0 14px;font-size:20px;line-height:1.5;font-weight:700">${esc(COPY.subtitle)}</p>
  <p style="margin:0 0 22px;font-size:16px;color:${T.fog}">${esc(COPY.lead)}</p>
  <div>${chip("블랙 · 베이지 택1")}${chip("M ~ 3XL")}${chip("구성: 코트 1벌")}${chip("무료배송")}</div>`, T.paper, "40px 32px 32px")}
<div style="padding:0 32px 48px;background:${T.paper}">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid ${T.line}"><tr>
  ${stat("구성", "코트 1벌")}${stat("디자인", "2종 택1")}${stat("총장", "94~102cm")}${stat("사이즈", "M ~ 3XL", true)}
  </tr></table>
</div>
${sec(`${kicker("OPTION")}${h2("컬러와 사이즈를 하나씩 골라 주세요")}${lead("블랙과 베이지는 각각 다른 디자인의 코트입니다. 옵션 1개를 선택하면 해당 컬러·사이즈의 코트 1벌이 배송됩니다.")}
  <table style="width:100%;border-collapse:collapse;margin-top:20px">${optRow("블랙", "black-front.jpg")}${optRow("베이지", "beige-front.jpg")}</table>
  <p style="margin:12px 0 0;font-size:14px;color:${T.fog}">총 ${COLORS.length * SIZE.length}개 옵션 (${COLORS.join(" · ")} × ${SIZE.map((r) => r.s).join(" · ")})</p>`, T.cream)}
${sec(`${kicker("MOOD")}${h2("은행잎이 지는 계절, 배색 후드 롱코트")}${lead(COPY.mood)}`)}
${img("black-bag.jpg", "Black look")}
${caption("BLACK · AUTUMN STREET")}
<div style="height:8px;background:${T.paper}"></div>
${sec(`${kicker("CHECK POINT")}${h2("이 코트를 고르는 4가지 이유")}${lead("코트 한 벌에 필요한 디테일을 모두 담았습니다.")}`, T.paper, "56px 32px 0")}
${point("01", "대비 컬러 배색 디자인", "블랙 코트는 베이지, 베이지 코트는 블랙으로 후드와 안쪽 여밈을 배색했습니다. 겹쳐 입은 듯 보이지만 코트 1벌로 된 일체형 디자인입니다.", "detail-hood-black.jpg", "COLOR BLOCK")}
${point("02", "봉제형 일체 후드", "후드가 몸판에 봉제되어 있어 분리되거나 잃어버릴 걱정이 없습니다. 바람이 찬 날에는 그대로 써서 보온을 더할 수 있습니다.", "detail-hood-beige.jpg", "ATTACHED HOOD")}
${point("03", "무릎 아래 미드 기장", "총장 94~102cm로 무릎 아래까지 내려오는 여유 있는 롱 기장입니다. 루즈핏 실루엣이 체형을 편안하게 감싸 줍니다.", "black-back.jpg", "MID LENGTH")}
${point("04", "밴딩 소매 · 사이드 포켓", "소매 끝 고무 밴딩이 찬바람을 막아 주고, 양옆 포켓은 손을 넣기 편한 위치에 있습니다.", "detail-cuff-beige.jpg", "ELASTIC CUFF")}
<div style="height:56px;background:${T.paper}"></div>
${sec(`${kicker("COLOR")}${h2("두 가지 디자인, 원하는 1벌을 선택하세요")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr>
    <td style="width:50%;padding:0 6px 0 0;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img("black-front.jpg", "Black")}</div><p style="margin:12px 0 0;font-size:18px;font-weight:800">블랙</p><p style="margin:2px 0 0;font-size:14px;color:${T.fog}">블랙 바디 + 베이지 배색 후드·여밈</p></td>
    <td style="width:50%;padding:0 0 0 6px;vertical-align:top"><div style="border-radius:14px;overflow:hidden">${img("beige-front.jpg", "Beige")}</div><p style="margin:12px 0 0;font-size:18px;font-weight:800">베이지</p><p style="margin:2px 0 0;font-size:14px;color:${T.fog}">베이지 바디 + 블랙 배색 후드·여밈</p></td>
  </tr></table>`, T.cream)}
${img("beige-open.jpg", "Beige look")}
${caption("BEIGE · GINKGO AVENUE")}
${sec(`${kicker("ORIGINAL DESIGN")}${h2("원래 디자인 그대로")}${lead("모델 없이 코트만 촬영한 단독 컷입니다. 후드부터 앞 여밈까지 이어지는 배색 라인, 4개 단추 여밈, 플랩 포켓, 밴딩 소매를 확인하세요.")}
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:20px"><tr>
    <td style="width:50%;padding:0 6px 0 0;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("design-front.jpg", "Front")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">정면</p></td>
    <td style="width:50%;padding:0 0 0 6px;vertical-align:top"><div style="border-radius:14px;overflow:hidden;background:#fff">${img("design-side.jpg", "Side")}</div><p style="margin:10px 0 0;font-size:14px;color:${T.fog};text-align:center">측면</p></td>
  </tr></table>`, T.cream)}
${sec(`${kicker("PRODUCT INFO")}${h2("상품 정보")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
  ${row("컬러", "블랙 / 베이지 (택1)")}${row("사이즈", "M · L · XL · 2XL · 3XL")}${row("겉감", "울 블렌드")}${row("주소재", "비스코스")}${row("안감", "폴리에스터")}${row("기장", "롱 (80~100cm)")}${row("후드", "있음 (일체형)")}${row("성별", "남성 · 성인")}${row("구성", "코트 1벌")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">모니터 환경에 따라 실제 색상과 약간 차이가 있을 수 있습니다.</p>`)}
${sec(`${kicker("REAL DETAIL")}${h2("실물 디테일")}${lead("후드, 포켓 플랩, 밴딩 소매, 배색 여밈과 안감을 가까이에서 확인하세요.")}
  <p style="margin:24px 0 10px;font-size:16px;font-weight:800">블랙 <span style="font-size:14px;font-weight:600;color:${T.fog}">블랙 바디 + 베이지 후드·여밈</span></p>
  <div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-real.jpg", "Black detail")}</div>
  <p style="margin:28px 0 10px;font-size:16px;font-weight:800">베이지 <span style="font-size:14px;font-weight:600;color:${T.fog}">베이지 바디 + 블랙 후드·여밈</span></p>
  <div style="border-radius:14px;overflow:hidden;background:#fff">${img("detail-real-beige.jpg", "Beige detail")}</div>`)}
${sec(`${kicker("MODEL CAST")}${h2("이 상품의 화보 모델")}
  <table style="width:100%;border-collapse:collapse">${row("이름", CAST.name)}${row("성별", CAST.gender)}${row("국적", CAST.nationality)}${row("관심사", CAST.interests.join(" · "))}${row("소속사", "AMBA (AI Ambassador)")}</table>`, T.cream)}
${sec(`${kicker("SIZE GUIDE")}${h2("사이즈 가이드")}
  <table style="width:100%;border-collapse:collapse;background:#fff">
    <tr>${th("사이즈")}${th("총장")}${th("어깨너비")}${th("가슴둘레")}${th("소매길이")}</tr>
    ${SIZE.map((r) => `<tr>${td(r.s, true)}${td(r.len)}${td(r.shoulder)}${td(r.chest)}${td(r.sleeve)}</tr>`).join("")}
  </table>
  <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${T.fog}">단위 cm · 수작업 측정으로 2~5cm 오차가 있을 수 있습니다.<br/>아시아 사이즈로 일반 해외 브랜드보다 1~2 사이즈 작게 나옵니다. 두 사이즈 사이라면 큰 사이즈를 권장합니다.</p>`)}
${sec(`${kicker("DETAILS")}${h2("제품 정보")}
  <table style="width:100%;border-collapse:collapse">
  ${row("Brand", "LEXI")}${row("Product", TITLE)}${row("Internal name", P.titleInternal)}${row("Package", "코트 1벌")}${row("Fit", "롱 기장(총장 94~102cm) · 루즈핏 · 후드 일체형 · 남성")}${row("Color", "블랙 / 베이지 중 택1")}${row("Size", "M · L · XL · 2XL · 3XL")}${row("Season", P.spec.season)}${row("Material", P.spec.material)}${row("Care", P.spec.care)}
  </table>
  <p style="margin:28px 0 0;text-align:center;font-size:15px;line-height:1.7"><strong style="font-size:17px">LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p>`, T.cream)}
${sec(`${kicker("STYLING")}${h2("이렇게 입어 보세요")}${look("CITY", s1 ?? "")}${look("WEEKEND", s2 ?? "")}${look("CLASSIC", s3 ?? "")}`)}
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
  console.log("built", SHOTS.length + 1, "images", frag.length, "chars");
}

if (process.argv[1]?.includes("build-trench-coupang-v3")) {
  main().catch((e) => { console.error("FAIL", e?.message ?? e); process.exit(1); });
}
