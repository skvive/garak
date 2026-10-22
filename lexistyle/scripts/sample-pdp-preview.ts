/** Sample PDP HTML — uses same render path as HQ studio (template engine) */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderDesignDoc } from "../src/lib/renewal/render";
import { templatePdp, PDP_RULESET_ID } from "../src/lib/pdp/ruleset";
import { defaultConceptSpec } from "../src/lib/pdp/concept-spec";
import type { DesignBlock } from "../src/lib/hq/types";

const sample = {
  title: "글로우 세럼 30ml · LEXI Sample",
  category: "뷰티",
  price: "USD 28",
  seller: "Shenzhen Beauty Tools",
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

const concept = defaultConceptSpec(1);
concept.layoutId = "editorial-fullbleed";
concept.voice = "성수 에디토리얼";
concept.blockPlan = ["hero", "gallery", "usp", "story", "spec", "faq", "cta"];

const assetUrls = [
  "https://picsum.photos/seed/lexi-glow-serum/800/1000",
  "https://picsum.photos/seed/lexi-glow-detail/800/800",
  "https://picsum.photos/seed/lexi-glow-pack/800/800",
];

const plan = concept.blockPlan ?? [];
const catalog: Record<string, DesignBlock | null> = {
  hero: { type: "hero", headline: doc.title, sub: doc.subtitle, assetIndex: 0 },
  gallery: { type: "gallery", assetIndexes: [1, 2] },
  usp: { type: "usp", items: doc.usps },
  story: { type: "story", html: doc.descriptionHtml },
  spec: {
    type: "spec-table",
    rows: [
      ["Brand", "LEXI"],
      ["Ruleset", PDP_RULESET_ID],
      ["Price", sample.price],
      ["Seller", sample.seller],
    ],
  },
  faq: { type: "faq", items: doc.faq },
  cta: { type: "cta", label: doc.ctaLabel },
};
const blocks: DesignBlock[] = [];
for (const key of plan) {
  const b = catalog[key];
  if (b) blocks.push(b);
}

const assets = assetUrls.map((url, i) => ({
  kind: (i === 0 ? "hero" : "detail") as "hero" | "detail",
  url,
  source: "edited" as const,
}));

const html = renderDesignDoc({ blocks }, assets, {
  layoutId: concept.layoutId,
  tokens: concept.tokens,
});

const outPath = join(process.cwd(), "scripts", ".sample-pdp-preview.html");
const page = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${doc.title}</title>
<style>
  :root { word-break: keep-all; }
  body { margin: 0; background: #eceae6; font-family: Pretendard, system-ui, sans-serif; }
  main { padding: 24px; }
</style>
</head>
<body>
<main>
${html}
</main>
</body>
</html>
`;
writeFileSync(outPath, page, "utf8");

const checks = {
  hasLayout: html.includes('data-layout="editorial-fullbleed"'),
  hasTitle: html.includes("글로우 세럼"),
  hasCta: html.includes("장바구니 담기"),
  hasFaq: html.includes("반품은 어떻게"),
  hasHeroImg: html.includes("lexi-glow-serum"),
  bytes: html.length,
};

console.log(JSON.stringify({ ok: Object.values(checks).every((v) => v !== false), outPath, checks }, null, 2));
console.log("---HTML_BEGIN---");
console.log(html);
console.log("---HTML_END---");
