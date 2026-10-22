/**
 * One-shot: PDP engine → HTML preview (Wan images if WAN_API_KEY set).
 * Usage: npx tsx scripts/make-pdp-preview.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { renderPdp } from "../src/lib/pdp/generate";
import { generatePdpText } from "../src/lib/pdp/text-generate";
import { defaultConceptSpec } from "../src/lib/pdp/concept-spec";
import { generateMarketingAssets } from "../src/lib/pdp/marketing-images";
import { wanConfigured } from "../src/lib/wan/config";

loadEnv({ path: join(process.cwd(), ".env") });

const PRODUCT = {
  title: "글로우 리페어 세럼 30ml",
  category: "뷰티 · 스킨케어",
  price: "USD 32",
  seller: "LEXI Curated",
};

async function main() {
  console.log("[1/3] copy…", { wan: wanConfigured() });
  const { doc, engine } = await generatePdpText({
    title: PRODUCT.title,
    category: PRODUCT.category,
    price: PRODUCT.price,
    seller: PRODUCT.seller,
    assetUrls: [],
  });
  console.log("[1/3] engine=", engine);

  console.log("[2/3] images…");
  const marketing = await generateMarketingAssets({
    productName: PRODUCT.title,
    category: PRODUCT.category,
    supplierCode: "preview",
  });
  const assetUrls =
    marketing.urls.length > 0
      ? marketing.urls
      : [
          "https://picsum.photos/seed/lexi-glow-hero/800/1000",
          "https://picsum.photos/seed/lexi-glow-macro/800/800",
          "https://picsum.photos/seed/lexi-glow-trust/800/800",
        ];
  console.log("[2/3] urls=", assetUrls.length, "mock=", marketing.imageMock, marketing.imageError ?? "");

  const concept = defaultConceptSpec(1);
  concept.layoutId = "editorial-fullbleed";
  concept.voice = "성수 에디토리얼";
  concept.blockPlan = ["hero", "gallery", "usp", "story", "spec", "faq", "cta"];

  console.log("[3/3] render…");
  const fragment = renderPdp(doc, assetUrls, concept);
  const outPath = join(process.cwd(), "scripts", ".sample-pdp-preview.html");
  const page = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${PRODUCT.title} · LEXI PDP</title>
<style>
  :root { word-break: keep-all; }
  body { margin:0; background:#f4f1ea; color:#1a1a1a; font-family:"Pretendard",system-ui,sans-serif; font-size:14px; line-height:1.6; }
  .wrap { max-width:720px; margin:0 auto; background:#fff; min-height:100vh; box-shadow:0 0 0 1px #e8e4dc; }
  .meta { padding:12px 16px; font-size:12px; color:#666; border-bottom:1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="meta">LEXI PDP engine · ${engine} · images ${assetUrls.length}/3${marketing.imageMock ? " (mock)" : ""}</div>
  ${fragment}
</div>
</body>
</html>`;
  writeFileSync(outPath, page, "utf8");
  console.log("WROTE", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
