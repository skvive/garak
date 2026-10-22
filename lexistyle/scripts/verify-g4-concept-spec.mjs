/** G4 smoke: locked ConceptSpec → lookbook-split HTML + body.conceptSpec */
import { renderPdp, toBlocks } from "../src/lib/pdp/generate.ts";

const conceptSpec = {
  layoutId: "lookbook-split",
  tokens: { paper: "#faf9f7", ink: "#1a1a1a", accent: "#e85d4c", radius: "14px", heroRatio: "4/5" },
  blockPlan: ["hero", "usp", "cta"],
  voice: "룩북",
  copyRuleset: "lexi-pdp-v1",
};

const doc = {
  title: "Test SKU",
  subtitle: "Editorial sub",
  descriptionHtml: "<p>Story</p>",
  usps: ["USP 1", "USP 2", "USP 3"],
  faq: [{ q: "Q?", a: "A." }],
  ctaLabel: "Add to bag",
  seoKeywords: [],
  galleryAssetIndexes: [0, 1],
};

const urls = ["https://example.com/hero.jpg", "https://example.com/detail.jpg"];
const html = renderPdp(doc, urls, conceptSpec);
const blocks = toBlocks(doc, urls, conceptSpec);

const ok =
  html.includes("grid-template-columns:1fr 1fr") &&
  blocks.length === 3 &&
  blocks[0]?.type === "hero";

if (!ok) {
  console.error("G4 verify FAILED", { hasSplit: html.includes("grid-template-columns:1fr 1fr"), blocks: blocks.length });
  process.exit(1);
}

const body = { conceptSpec, templateId: 42, designDoc: { blocks } };
console.log("G4 verify OK", {
  layoutId: conceptSpec.layoutId,
  blockPlan: conceptSpec.blockPlan,
  bodyKeys: Object.keys(body),
});
