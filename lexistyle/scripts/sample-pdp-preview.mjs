/** Sample PDP HTML smoke — template engine + ConceptSpec render (no API keys) */
import { writeFileSync } from "node:fs";
import { renderPdp } from "../src/lib/pdp/generate.ts";
import { templatePdp } from "../src/lib/pdp/ruleset.ts";
import { defaultConceptSpec } from "../src/lib/pdp/concept-spec.ts";

const sample = {
  title: "글로우 세럼 30ml · LEXI Sample",
  category: "뷰티",
  price: "USD 28",
  seller: "Guangzhou Apparel Studio",
};

const doc = templatePdp(sample);
doc.subtitle = "성수 에디토리얼 · 크림 페이퍼";
doc.descriptionHtml =
  "<p>글로우 세럼 30ml는 LEXI 에디토리얼 룩으로 재구성한 시드 상세입니다. 관세 포함 가격과 큐레이션된 히어로로 채널 송출 전 미리보기를 검증합니다.</p>";
doc.usps = [
  "에디토리얼 히어로 · 풀블리드 레이아웃",
  "관세·배송 안내는 FAQ에 고정",
  "동일 ConceptSpec으로 N건 공장 적용 가능",
];
doc.faq = [
  { q: "반품은 어떻게 하나요?", a: "공급사 A/S 센터에서 처리하며 LEXI가 티켓을 열어 추적합니다." },
  { q: "관세가 포함되나요?", a: "결제 금액에 목적지 예상 관세가 포함됩니다." },
];
doc.ctaLabel = "장바구니 담기";

const conceptSpec = {
  ...defaultConceptSpec(1),
  layoutId: "editorial-fullbleed",
  voice: "성수 에디토리얼",
  blockPlan: ["hero", "gallery", "usp", "story", "spec", "faq", "cta"],
};

const assetUrls = [
  "https://picsum.photos/seed/lexi-glow-serum/800/1000",
  "https://picsum.photos/seed/lexi-glow-detail/800/800",
  "https://picsum.photos/seed/lexi-glow-pack/800/800",
];

const html = renderPdp(doc, assetUrls, conceptSpec);
const out = `scripts/.sample-pdp-preview.html`;
writeFileSync(
  out,
  `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>${doc.title}</title>
<style>body{margin:0;background:#f5f5f3;font-family:Pretendard,system-ui,sans-serif}main{padding:24px}</style>
</head><body><main>${html}</main></body></html>`,
  "utf8",
);

console.log(JSON.stringify({ ok: true, out, bytes: html.length, title: doc.title, layoutId: conceptSpec.layoutId }, null, 2));
console.log("---HTML_BEGIN---");
console.log(html);
console.log("---HTML_END---");
