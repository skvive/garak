import type { PdpStructured } from "./ruleset";
// 100개 배치 생성분 — amba-casts.ts와 동일한 이유(Vercel serverless가 런타임에
// public/ 파일을 process.cwd()로 못 읽음)로 개별 파일 대신 번들되는 단일 JSON을
// 정적 import한다. 키는 slug.
import sample3Batch from "./sample3-batch-data.json";
type BatchOverride = { html: string; structured: PdpStructured; assetUrls: string[] };
const BATCH: Record<string, BatchOverride> = sample3Batch as Record<string, BatchOverride>;

const YELLOW_POLKA_SLUG =
  "yellow-polka-dot-linen-blouse-for-women-lace-tri-2608250355321611800";

const assets = [
  "/pdp/yellow-polka-blouse/hero-v1.webp",
  "/pdp/yellow-polka-blouse/macro-v1.webp",
  "/pdp/yellow-polka-blouse/desire-v1.webp",
];

const PLAID_RIBBON_PREFIX = "plaid-long-ski";
const plaidAssets = [
  "/pdp/plaid-ribbon-maxi-dress/hero-v1.webp",
  "/pdp/plaid-ribbon-maxi-dress/detail-v1.webp",
  "/pdp/plaid-ribbon-maxi-dress/silhouette-v1.webp",
];

const plaidStructured: PdpStructured = {
  title: "블루 깅엄 리본 맥시 드레스",
  subtitle: "여름의 리듬을 가볍게 담은, 체크 리본 맥시 드레스.",
  descriptionHtml: "<p>선명한 블루 깅엄과 어깨 리본이 만드는 산뜻한 여름 실루엣입니다.</p><p>허리의 잔잔한 셔링과 길게 흐르는 스커트가 하루의 움직임을 편안하게 따라갑니다.</p>",
  usps: ["어깨 리본 스트랩과 산뜻한 스퀘어 넥", "블루·화이트 깅엄 체크의 경쾌한 표정", "가볍게 퍼지는 맥시 A라인 실루엣"],
  faq: [
    { q: "어떤 신발과 잘 어울리나요?", a: "화이트 플랫, 가벼운 샌들, 라피아 소재 액세서리와 자연스럽게 어울립니다." },
    { q: "어깨 리본은 조절할 수 있나요?", a: "리본 디테일은 상품 수령 후 실제 봉제 상태와 관리 라벨을 확인해 주세요." },
    { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
  ],
  ctaLabel: "LEXI 장바구니 담기",
  seoKeywords: ["LEXI", "블루 깅엄 리본 맥시 드레스", "체크 맥시 원피스", "여름 리본 드레스"],
  galleryAssetIndexes: [0, 1, 2],
};

const plaidHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${plaidAssets[0]}" alt="블루 깅엄 리본 맥시 드레스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · SUMMER WALK</p><h1 style="margin:0;font-size:32px;line-height:1.25">블루 깅엄 리본 맥시 드레스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">여름의 리듬을 가볍게 담은, 체크 리본 맥시 드레스.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${plaidAssets[1]}" alt="깅엄 체크와 리본 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${plaidAssets[2]}" alt="블루 깅엄 리본 맥시 드레스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">린웨이 · Lin Wei</strong> · 여성 · 중국<br/>스튜디오 라이트 · 미니멀 스타일 · 필름<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${plaidStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">선명한 블루 깅엄과 어깨 리본이 만드는 산뜻한 여름 실루엣입니다.</p><p style="margin:0">허리의 잔잔한 셔링과 길게 흐르는 스커트가 하루의 움직임을 편안하게 따라갑니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">화이트 플랫이나 낮은 샌들과 매치하고, 라피아 가방으로 가벼운 여름 질감을 더해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">블루 깅엄 리본 맥시 드레스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Plaid Long Skirt Bow-tie Shoulder Straps And Ruffled Waistline Dress</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">맥시 기장 · 스퀘어 넥 · 리본 스트랩</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">블루 · 화이트 깅엄 체크</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">봄·여름 데일리</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${plaidStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;

const structured: PdpStructured = {
  title: "버터 도트 레이스 블라우스",
  subtitle: "가벼운 하루에 작은 도트를 더한, 부드러운 레이스 블라우스.",
  descriptionHtml:
    "<p>햇살이 드는 날 가장 먼저 손이 가는, 산뜻한 옐로 린넨 레이어입니다.</p><p>잔잔한 블랙 도트와 레이스 트리밍이 담백한 표정에 리듬을 더합니다. 가볍게 흐르는 롱슬리브와 여유로운 실루엣은 출근길부터 늦은 오후의 약속까지 편안하게 어울립니다.</p>",
  usps: [
    "레이스 V넥과 미세 도트가 만드는 은은한 포인트",
    "가벼운 린넨 터치와 자연스러운 볼륨 소매",
    "데님부터 아이보리 팬츠까지 편안한 데일리 레이어",
  ],
  faq: [
    { q: "어떤 하의와 잘 어울리나요?", a: "밝은 데님, 아이보리 팬츠, 미디 스커트처럼 단정한 하의와 자연스럽게 어울립니다." },
    { q: "세탁할 때 주의할 점이 있나요?", a: "레이스 트리밍과 원단 결을 위해 단독 손세탁 또는 세탁망 사용을 권장합니다. 정확한 관리 표기는 수령한 상품 라벨을 확인해 주세요." },
    { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
  ],
  ctaLabel: "LEXI 장바구니 담기",
  seoKeywords: ["LEXI", "버터 도트 레이스 블라우스", "린넨 블라우스", "레이스 V넥 블라우스"],
  galleryAssetIndexes: [0, 1, 2],
};

const html = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${assets[0]}" alt="버터 도트 레이스 블라우스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · LIGHT LAYERS</p><h1 style="margin:0;font-size:32px;line-height:1.25;letter-spacing:0;color:#1a1a1a">버터 도트 레이스 블라우스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">가벼운 하루에 작은 도트를 더한, 부드러운 레이스 블라우스.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${assets[1]}" alt="레이스와 도트 소재 디테일" width="720" height="720" style="width:100%;height:auto;border-radius:14px"/><img src="${assets[2]}" alt="버터 도트 레이스 블라우스 라이프스타일 화보" width="960" height="1200" style="width:100%;height:auto;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">서아린 · Seo Arin</strong> · 여성 · 대한민국<br/>주말 카페 산책 · 린넨 스타일링 · 빈티지 북숍<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${structured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">햇살이 드는 날 가장 먼저 손이 가는, 산뜻한 옐로 린넨 레이어입니다.</p><p style="margin:0">잔잔한 블랙 도트와 레이스 트리밍이 담백한 표정에 리듬을 더합니다. 가볍게 흐르는 롱슬리브와 여유로운 실루엣은 출근길부터 늦은 오후의 약속까지 편안하게 어울립니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">아이보리 스트레이트 팬츠와 매치해 밝고 차분하게 연출하세요. 작은 브라운 가방과 플랫 슈즈로 도트 컬러를 은근히 연결해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">버터 도트 레이스 블라우스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Yellow Polka-Dot Linen Blouse For Women Lace-Trimmed V-Neck Commuter-Style Designer Top</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">여유로운 실루엣 · V넥 · 롱슬리브</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">버터 옐로 · 블랙 도트</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">봄·여름 데일리</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${structured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;

const BLACK_KNIT_PREFIX = "black-slim-fit";
const blackKnitAssets = [
  "/pdp/black-knit-midi-dress/hero-v1.webp",
  "/pdp/black-knit-midi-dress/detail-v1.webp",
  "/pdp/black-knit-midi-dress/silhouette-v1.webp",
];

const blackKnitStructured: PdpStructured = {
  title: "블랙 니트 드레이프 미디 드레스",
  subtitle: "절제된 니트 텍스처와 허리 드레이프가 만드는 단정한 존재감.",
  descriptionHtml: "<p>매끈한 슬리브리스 니트와 자연스럽게 모인 허리선이 조용한 균형을 만듭니다.</p><p>몸을 따라 정리되는 상의와 가볍게 퍼지는 미디 스커트가 낮부터 저녁까지 선명한 실루엣을 완성합니다.</p>",
  usps: ["매끈한 라운드 넥의 슬리브리스 니트 디자인", "사선으로 모이는 허리 드레이프 디테일", "움직임에 따라 부드럽게 퍼지는 미디 A라인"],
  faq: [
    { q: "어떤 자리에서 입기 좋나요?", a: "미니멀한 액세서리와 함께하면 출근, 저녁 약속, 전시 관람에 모두 단정하게 어울립니다." },
    { q: "니트 소재는 어떻게 관리하나요?", a: "형태와 결을 위해 단독 손세탁 또는 세탁망 사용을 권장합니다. 정확한 관리 표기는 수령한 상품 라벨을 확인해 주세요." },
    { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
  ],
  ctaLabel: "LEXI 장바구니 담기",
  seoKeywords: ["LEXI", "블랙 니트 드레이프 미디 드레스", "슬리브리스 니트 원피스", "블랙 미디 드레스"],
  galleryAssetIndexes: [0, 1, 2],
};

const blackKnitHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${blackKnitAssets[0]}" alt="블랙 니트 드레이프 미디 드레스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · QUIET FORM</p><h1 style="margin:0;font-size:32px;line-height:1.25">블랙 니트 드레이프 미디 드레스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">절제된 니트 텍스처와 허리 드레이프가 만드는 단정한 존재감.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${blackKnitAssets[1]}" alt="블랙 니트와 허리 드레이프 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${blackKnitAssets[2]}" alt="블랙 니트 드레이프 미디 드레스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">도지원 · Do Jiwon</strong> · 여성 · 대한민국<br/>하이 패션 · 에디토리얼 · 런웨이<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${blackKnitStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">매끈한 슬리브리스 니트와 자연스럽게 모인 허리선이 조용한 균형을 만듭니다.</p><p style="margin:0">몸을 따라 정리되는 상의와 가볍게 퍼지는 미디 스커트가 낮부터 저녁까지 선명한 실루엣을 완성합니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">블랙 펌프스나 낮은 슬링백을 매치하고, 메탈 이어링 하나로 균형을 더해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">블랙 니트 드레이프 미디 드레스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Black Slim-fit Knitted Vest Dress</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">슬림 상의 · 드레이프 허리 · 미디 A라인</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">블랙</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">사계절 시티웨어</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${blackKnitStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;
const FISHTAIL_PREFIX = "v-neck-long-sleeve-figure-flattering-fishtail-dr";
const fishtailAssets = [
  "/pdp/fishtail-midi-dress/hero-v1.webp",
  "/pdp/fishtail-midi-dress/detail-v1.webp",
  "/pdp/fishtail-midi-dress/silhouette-v1.webp",
];

const fishtailStructured: PdpStructured = {
  title: "버건디 랩 드레이프 피시테일 드레스",
  subtitle: "랩 V넥과 유려한 드레이핑이 만드는 저녁의 실루엣.",
  descriptionHtml:
    "<p>버건디 원단 위로 랩 V넥이 지고, 허리 절개 드레이프가 부드럽게 감깁니다.</p><p>종아리까지 이어지는 피시테일 실루엣이 걸음마다 우아하게 흐릅니다.</p>",
  usps: [
    "버건디 컬러의 고급스러운 표정",
    "랩 스타일 V넥과 허리 드레이프 구조",
    "드라마틱한 머메이드·피시테일 실루엣",
  ],
  faq: [
    { q: "어떤 행사에 어울리나요?", a: "저녁 자리, 파티, 미니멀 웨딩 게스트 룩에 어울립니다. 슬링백 힐과 함께 착용하세요." },
    { q: "소재와 관리법은?", a: "드레스 원단은 상품 수령 후 관리 라벨을 확인해 주세요. 어두운 컬러라 첫 세탁은 단독 손세탁을 권장합니다." },
    { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
  ],
  ctaLabel: "LEXI 장바구니 담기",
  seoKeywords: ["LEXI", "버건디 피시테일 드레스", "랩 뷔넥 드레스", "머메이드 드레스"],
  galleryAssetIndexes: [0, 1, 2],
};

const fishtailHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${fishtailAssets[0]}" alt="버건디 랩 드레이프 피시테일 드레스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · EVENING FORM</p><h1 style="margin:0;font-size:32px;line-height:1.25">버건디 랩 드레이프 피시테일 드레스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">랩 V넥과 유려한 드레이핑이 만드는 저녁의 실루엣.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${fishtailAssets[1]}" alt="버건디 랩 V넥과 허리 드레이프 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${fishtailAssets[2]}" alt="버건디 피시테일 드레스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">아마야 · Amaya</strong> · 여성 · 대한민국<br/>스튜디오 라이트 · 미니멀 스타일 · 필름<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${fishtailStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">버건디 원단 위로 랩 V넥이 지고, 허리 절개 드레이프가 부드럽게 감깁니다.</p><p style="margin:0">종아리까지 이어지는 피시테일 실루엣이 걸음마다 우아하게 흐릅니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">블랙 슬링백 힐과 미니멀 메탈 이어링을 매치하고, 짧은 클러치로 균형을 더해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">버건디 랩 드레이프 피시테일 드레스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">V-neck Long-sleeve Figure-flattering Fishtail Dress</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">랩 V넥 · 허리 드레이프 · 피시테일 미디</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">버건디</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">봄·가을 이브닝</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${fishtailStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;

const PEACOCK_PREFIX = "peacock-blue-deep-v-neck-ruffled-dress";
const peacockAssets = [
  "/pdp/peacock-ruffled-dress/hero-v1.webp",
  "/pdp/peacock-ruffled-dress/detail-v1.webp",
  "/pdp/peacock-ruffled-dress/silhouette-v1.webp",
];

const peacockStructured: PdpStructured = {
  title: "공작블루 딥 V넥 러플 드레스",
  subtitle: "선명한 공작블루와 러플 디테일이 만드는 시크한 원피스.",
  descriptionHtml:
    "<p>깊은 V넥과 러플 장식이 돋보이는 원피스입니다.</p><p>공작블루 컬러가 얼굴을 밝게 하고, 깔끔한 실루엣이 드레시한 분위기를 완성합니다.</p>",
  usps: [
    "선명한 공작블루 컬러",
    "딥 V넥과 우아한 러플 디테일",
    "다양한 자리에서 활용 가능한 드레시 실루엣",
  ],
  faq: [
    { q: "어떤 자리에 어울리나요?", a: "데이트, 파티, 오피스룩까지 폭넓게 활용할 수 있는 원피스입니다. 미니멀 힐과 매치하면 완성도가 높습니다." },
    { q: "소재와 관리법은?", a: "원단은 상품 수령 후 관리 라벨을 확인해 주세요. 세탁 시 찬물 단독 손세탁을 권장합니다." },
    { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
  ],
  ctaLabel: "LEXI 장바구니 담기",
  seoKeywords: ["LEXI", "공작블루 원피스", "딥 뷔넥 러플 드레스", "파티 드레스"],
  galleryAssetIndexes: [0, 1, 2],
};

const peacockHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${peacockAssets[0]}" alt="공작블루 딥 V넥 러플 드레스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · PEACOCK BLUE</p><h1 style="margin:0;font-size:32px;line-height:1.25">공작블루 딥 V넥 러플 드레스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">선명한 공작블루와 러플 디테일이 만드는 시크한 원피스.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${peacockAssets[1]}" alt="공작블루 딥 V넥과 러플 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${peacockAssets[2]}" alt="공작블루 러플 드레스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">루나 · Luna</strong> · 여성 · 대한민국<br/>스튜디오 라이트 · 미니멀 스타일 · 필름<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${peacockStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">깊은 V넥과 러플 장식이 돋보이는 원피스입니다.</p><p style="margin:0">공작블루 컬러가 얼굴을 밝게 하고, 깔끔한 실루엣이 드레시한 분위기를 완성합니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">베이지 슬링백과 미니멀 골드 이어링을 매치해, 공작블루를 더욱 돋보이게 해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">공작블루 딥 V넥 러플 드레스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Peacock Blue Deep V-Neck Ruffled Dress</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">딥 V넥 · 러플 트림 · 미니 드레스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">공작블루</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">봄·여름 데일리/파티</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${peacockStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;

export function getSample3StorefrontOverride(slug: string) {
  if (slug === YELLOW_POLKA_SLUG) return { html, structured, assetUrls: assets };
  if (slug.startsWith(PLAID_RIBBON_PREFIX)) {
    return { html: plaidHtml, structured: plaidStructured, assetUrls: plaidAssets };
  }
  if (slug.startsWith(BLACK_KNIT_PREFIX)) {
    return { html: blackKnitHtml, structured: blackKnitStructured, assetUrls: blackKnitAssets };
  }
  if (slug.startsWith(FISHTAIL_PREFIX)) {
    return { html: fishtailHtml, structured: fishtailStructured, assetUrls: fishtailAssets };
  }
  if (slug.startsWith(PEACOCK_PREFIX)) {
    return { html: peacockHtml, structured: peacockStructured, assetUrls: peacockAssets };
  }

  const GOTHIC_PREFIX = "medieval-retro-gothic-halloween-hooded-dress";
  const gothicAssets = [
    "/pdp/gothic-hooded-dress/hero-v1.webp",
    "/pdp/gothic-hooded-dress/detail-v1.webp",
    "/pdp/gothic-hooded-dress/silhouette-v1.webp",
  ];
  const gothicStructured: PdpStructured = {
    title: "미드나잇 고딕 후드 드레스",
    subtitle: "중세 감성의 후드와 미니멀 실루엣이 만드는 시크한 밤의 무드.",
    descriptionHtml:
      "<p>부드러운 후드와 드레이프가 어우러진 다크 톤 드레스입니다.</p><p>중세 실루엣의 여운을 담아 포인트 룩으로 손색이 없는 한 벌입니다.</p>",
    usps: [
      "깊은 네이비·블랙 톤의 감도 높은 컬러",
      "후드와 드레이프가 살려주는 실루엣",
      "파티부터 시즌 룩까지 스타일링 가능",
    ],
    faq: [
      { q: "어떤 자리에 어울리나요?", a: "테마 파티, 가을·겨울 데이트, 컬렉션 셀렙까지 폭넓게 활용할 수 있습니다." },
      { q: "소재와 관리법은?", a: "원단은 상품 수령 후 관리 라벨을 확인해 주세요. 어두운 색이라 첫 세탁은 단독 손세탁을 권장합니다." },
      { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
    ],
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", "고딕 후드 드레스", "미드나잇 드레스", "시즌 파티 드레스"],
    galleryAssetIndexes: [0, 1, 2],
  };

  const gothicHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${gothicAssets[0]}" alt="미드나잇 고딕 후드 드레스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · MIDNIGHT</p><h1 style="margin:0;font-size:32px;line-height:1.25">미드나잇 고딕 후드 드레스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">중세 감성의 후드와 미니멀 실루엣이 만드는 시크한 밤의 무드.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${gothicAssets[1]}" alt="고딕 드레스 후드·러플 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${gothicAssets[2]}" alt="미드나잇 고딕 드레스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">샬롯 · Charlotte</strong> · 여성 · 대한민국<br/>스튜디오 라이트 · 미니멀 스타일 · 필름<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${gothicStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">부드러운 후드와 드레이프가 어우러진 다크 톤 드레스입니다.</p><p style="margin:0">중세 실루엣의 여운을 담아 포인트 룩으로 손색이 없는 한 벌입니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">블랙 부츠와 레이어드 체인 액세서리, 딥 립 컬러로 미드나잇 무드를 완성해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">미드나잇 고딕 후드 드레스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Medieval Retro Gothic Halloween Hooded Dress</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">후드 · 드레이프 · 롱 실루엣</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">블랙·네이비 톤</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">가을·겨울</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${gothicStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;

  if (slug.startsWith(GOTHIC_PREFIX)) {
    return { html: gothicHtml, structured: gothicStructured, assetUrls: gothicAssets };
  }

  const CARDIGAN_PREFIX = "long-sleeve-cardigan-dress-european-and-american";
  const cardiganAssets = [
    "/pdp/cardigan-floral-dress/hero-v1.webp",
    "/pdp/cardigan-floral-dress/detail-v1.webp",
    "/pdp/cardigan-floral-dress/silhouette-v1.webp",
  ];
  const cardiganStructured: PdpStructured = {
    title: "가든 플로럴 카디건 원피스",
    subtitle: "은은한 플로럴 패턴과 부드러운 니트 카디건 원피스.",
    descriptionHtml:
      "<p>봄 정원의 꽃을 닮은 플로럴 패턴이 돋보이는 카디건 원피스입니다.</p><p>가벼운 니트 질감이 데일리 룩에 편안한 실루엣을 더합니다.</p>",
    usps: [
      "유럽·미국 감성의 플로럴 프린트",
      "부드러운 니트 카디건 소재감",
      "데일리부터 여행 룩까지 편안한 스타일링",
    ],
    faq: [
      { q: "어떤 날씨에 어울리나요?", a: "봄·초여름 산책이나 트립 룩에 잘 어울리는 가벼운 니트 원피스입니다." },
      { q: "소재와 관리법은?", a: "원단은 상품 수령 후 관리 라벨을 확인해 주세요. 데리고 착용 시엔 플로럴 패턴의 컬러 이염에 주의하세요." },
      { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
    ],
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", "플로럴 카디건 원피스", "가든 플로럴 원피스", "니트 원피스"],
    galleryAssetIndexes: [0, 1, 2],
  };
  const cardiganHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${cardiganAssets[0]}" alt="가든 플로럴 카디건 원피스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · GARDEN FLORAL</p><h1 style="margin:0;font-size:32px;line-height:1.25">가든 플로럴 카디건 원피스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">은은한 플로럴 패턴과 부드러운 니트가 만드는 산뜻한 데일리 실루엣.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${cardiganAssets[1]}" alt="플로럴 니트 패턴 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${cardiganAssets[2]}" alt="가든 플로럴 카디건 원피스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">카밀레 · Camille</strong> · 여성 · 대한민국<br/>스튜디오 라이트 · 미니멀 스타일 · 필름<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${cardiganStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">봄 정원의 꽃을 닮은 플로럴 패턴이 돋보이는 카디건 원피스입니다.</p><p style="margin:0">가벼운 니트 질감이 데일리 룩에 편안한 실루엣을 더합니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">화이트 스니커즈와 미니멀 토트백을 매치해, 산뜻한 가든 데일리 룩을 완성해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">가든 플로럴 카디건 원피스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Long-sleeve Cardigan Dress, European And American Floral Design</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">롱슬리브 카디건 · 미디 실루엣</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">뉴트럴 베이스 · 플로럴 프린트</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">봄·초여름</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${cardiganStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;
  if (slug.startsWith(CARDIGAN_PREFIX)) {
    return { html: cardiganHtml, structured: cardiganStructured, assetUrls: cardiganAssets };
  }

  const SHEATH_PREFIX = "long-elegant-a-line-sheath-skirt-with-a-wrinkle-";
  const sheathAssets = [
    "/pdp/sheath-a-line-skirt/hero-v1.webp",
    "/pdp/sheath-a-line-skirt/detail-v1.webp",
    "/pdp/sheath-a-line-skirt/silhouette-v1.webp",
  ];
  const sheathStructured: PdpStructured = {
    title: "엘레건트 A라인 시스 스커트",
    subtitle: "군살 없이 떨어지는 A라인 실루엣의 롱 시스 스커트.",
    descriptionHtml:
      "<p>우아한 A라인 실루엣이 자연스러운 기장감을 살려주는 롱 스커트입니다.</p><p>구김에 강하고 세련된 톤 매치로 오피스에서 외출까지 폭넓게 어울립니다.</p>",
    usps: [
      "구김에 강한 시스 소재감",
      "우아하게 떨어지는 A라인 실루엣",
      "오피스부터 데일리까지 활용 가능",
    ],
    faq: [
      { q: "어떤 자리에 어울리나요?", a: "오피스룩, 출근룩, 세미 포멀 자리까지 다양하게 연출할 수 있습니다." },
      { q: "소재와 관리법은?", a: "구김에 강한 시스 원단입니다. 상품 수령 후 관리 라벨을 확인해 주세요." },
      { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
    ],
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", "A라인 롱스커트", "시스 스커트", "엘레건트 스커트"],
    galleryAssetIndexes: [0, 1, 2],
  };
  const sheathHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${sheathAssets[0]}" alt="엘레건트 A라인 시스 스커트 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · ELEGANT LINE</p><h1 style="margin:0;font-size:32px;line-height:1.25">엘레건트 A라인 시스 스커트</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">군살 없이 떨어지는 A라인 실루엣의 롱 시스 스커트.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${sheathAssets[1]}" alt="A라인 시스 스커트 원단 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${sheathAssets[2]}" alt="엘레건트 A라인 시스 스커트 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">수아 · Sua</strong> · 여성 · 대한민국<br/>하이 패션 · 에디토리얼 · 런웨이<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${sheathStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">우아한 A라인 실루엣이 자연스러운 기장감을 살려주는 롱 스커트입니다.</p><p style="margin:0">구김에 강하고 세련된 톤 매치로 오피스에서 외출까지 폭넓게 어울립니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">화이트 블라우스와 슬링백, 미니멀 토트백으로 세련된 오피스 룩을 완성해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">엘레건트 A라인 시스 스커트</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Long Elegant A-line Sheath Skirt With A Wrinkle-resistant Finish</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">A라인 · 롱 기장</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">화이트·뮤트 톤</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">사계절</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${sheathStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;
  if (slug.startsWith(SHEATH_PREFIX)) {
    return { html: sheathHtml, structured: sheathStructured, assetUrls: sheathAssets };
  }

  const RESORT_PREFIX = "womens-casual-resort-style-floral-print-dress";
  const resortAssets = [
    "/pdp/resort-floral-dress/hero-v1.webp",
    "/pdp/resort-floral-dress/detail-v1.webp",
    "/pdp/resort-floral-dress/silhouette-v1.webp",
  ];
  const resortStructured: PdpStructured = {
    title: "리조트 플로럴 원피스",
    subtitle: "여행지에서 빛나는, 화사한 플로럴 프린트 원피스.",
    descriptionHtml:
      "<p>밝고 상큼한 플로럴 프린트가 돋보이는 리조트 룩 원피스입니다.</p><p>가벼운 원단과 편안한 실루엣으로 바다부터 시내 산책까지 활용도가 높습니다.</p>",
    usps: [
      "화사한 플로럴 프린트",
      "리조트·여행에 어울리는 가벼운 원단",
      "데이트와 데일리 모두 가능한 실루엣",
    ],
    faq: [
      { q: "어떤 장소에 어울리나요?", a: "리조트, 여행, 데이트, 주말 외출 등에 잘 어울립니다." },
      { q: "소재와 관리법은?", a: "원단은 상품 수령 후 관리 라벨을 확인해 주세요. 여름 원단은 찬물 손세탁을 권장합니다." },
      { q: "배송과 통관은 어떻게 진행되나요?", a: "LEXI 소싱 해외 직배송 상품입니다. 결제 전 표시되는 관세 포함 금액과 배송 안내를 확인해 주세요." },
    ],
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", "리조트 원피스", "플로럴 원피스", "여름 원피스"],
    galleryAssetIndexes: [0, 1, 2],
  };
  const resortHtml = `<div class="lexi-pdp" data-layout="editorial-fullbleed" style="max-width:720px;margin:0 auto;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Inter,sans-serif">
  <section data-block="brand" style="padding:20px 24px 0"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;color:#e85d4c">LEXI.</p></section>
  <section data-block="hero" style="padding:24px 0 0;text-align:center"><img src="${resortAssets[0]}" alt="리조트 플로럴 원피스 전신 화보" width="960" height="1200" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover"/><div style="padding:20px 24px 0"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">LEXI CURATED · TROPICAL RESORT</p><h1 style="margin:0;font-size:32px;line-height:1.25">리조트 플로럴 원피스</h1><p style="margin:10px 0 0;color:#6e6e73;line-height:1.65">여행지에서 빛나는, 화사한 플로럴 프린트 원피스.</p></div></section>
  <section data-block="gallery" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:24px"><img src="${resortAssets[1]}" alt="리조트 플로럴 프린트 디테일" width="720" height="720" style="width:100%;border-radius:14px"/><img src="${resortAssets[2]}" alt="리조트 플로럴 원피스 실루엣" width="960" height="1200" style="width:100%;border-radius:14px"/></section>
  <section data-block="model-cast" style="margin:0 24px;padding:20px 0;border-top:1px solid #e8e4dc;border-bottom:1px solid #e8e4dc"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">AMBA</p><h2 style="margin:0;font-size:20px">이 상품의 화보 모델</h2><p style="margin:10px 0 0;line-height:1.7;color:#6e6e73"><strong style="color:#1a1a1a">안드레아 · Andrea</strong> · 여성 · 대한민국<br/>뷰티·데일리 무드<br/>AMBA (AI Ambassador)</p></section>
  <section data-block="usp" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">WHY LEXI</p><ul style="list-style:none;padding:0;margin:0">${resortStructured.usps.map((item) => `<li style="padding:11px 0;border-bottom:1px solid #e8e4dc;line-height:1.6">${item}</li>`).join("")}</ul></section>
  <section data-block="story" style="padding:0 24px 24px;line-height:1.75"><p style="margin:0 0 14px">밝고 상큼한 플로럴 프린트가 돋보이는 리조트 룩 원피스입니다.</p><p style="margin:0">가벼운 원단과 편안한 실루엣으로 바다부터 시내 산책까지 활용도가 높습니다.</p></section>
  <section data-block="styling" style="padding:24px;background:#ebe6dc"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">STYLING</p><p style="margin:0;line-height:1.75">스트랩 샌들과 라피아 토트백을 매치해 리조트 감성을 더해 보세요.</p></section>
  <section data-block="spec" style="padding:24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">DETAILS</p><h2 style="margin:0 0 14px;font-size:20px">제품 정보</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Brand</th><td style="padding:9px;border:1px solid #e8e4dc">LEXI</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Product</th><td style="padding:9px;border:1px solid #e8e4dc">리조트 플로럴 원피스</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Internal name</th><td style="padding:9px;border:1px solid #e8e4dc">Womens Casual Resort-style Floral-print Dress</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Fit</th><td style="padding:9px;border:1px solid #e8e4dc">플로럴 프린트 · 미디 실루엣</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Color</th><td style="padding:9px;border:1px solid #e8e4dc">플로럴 멀티컬러</td></tr><tr><th style="text-align:left;padding:9px;border:1px solid #e8e4dc">Season</th><td style="padding:9px;border:1px solid #e8e4dc">봄·여름</td></tr></tbody></table><p style="margin:18px 0 0;line-height:1.65"><strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</p></section>
  <section data-block="faq" style="padding:0 24px 24px"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#e85d4c">FAQ</p>${resortStructured.faq.map((item) => `<details style="margin:8px 0;padding:12px;border:1px solid #e8e4dc;border-radius:14px"><summary style="font-weight:700">${item.q}</summary><p style="margin:10px 0 0;line-height:1.65;color:#6e6e73">${item.a}</p></details>`).join("")}</section>
  <section data-block="cta" style="padding:0 24px 28px;text-align:center"><span style="display:inline-block;padding:14px 40px;border-radius:14px;background:#e85d4c;color:#fff;font-weight:700">LEXI 장바구니 담기</span></section>
</div>`;
  if (slug.startsWith(RESORT_PREFIX)) {
    return { html: resortHtml, structured: resortStructured, assetUrls: resortAssets };
  }
  if (BATCH[slug]) return BATCH[slug];
  return null;
}
