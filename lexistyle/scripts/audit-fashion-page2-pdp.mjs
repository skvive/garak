import fs from "node:fs/promises";

const manifestPath = process.argv[2] || "tmp/fashion-page-2-women.json";
const products = JSON.parse(await fs.readFile(manifestPath, "utf8"));

const audit = products.map((item) => {
  const body = item.catalog?.document_body || null;
  const blocks = body?.designDoc?.blocks || [];
  const blockTypes = blocks.map((block) => block.type);
  const hasSample3Order = ["brand", "hero", "gallery", "amba", "og", "usp", "story", "styling", "spec", "faq", "cta"]
    .every((type) => blockTypes.includes(type));
  const assetUrls = Array.isArray(body?.assetUrls) ? body.assetUrls : [];
  const correctLink = Number(body?.catalogId) === Number(item.catalogId);
  const isSample3 = correctLink && (
    String(body?.rulesetId || "").toLowerCase().includes("sample3") ||
    hasSample3Order
  );
  return {
    index: item.index,
    catalogId: item.catalogId,
    title: item.title,
    documentId: item.documentId,
    linkedCatalogId: body?.catalogId ?? null,
    correctLink,
    rulesetId: body?.rulesetId ?? null,
    engine: body?.engine ?? null,
    blockTypes,
    assetCount: assetUrls.length,
    isSample3,
    state: isSample3 ? "sample3-complete" : correctLink ? "legacy-pdp" : item.documentId ? "stale-link" : "not-generated",
  };
});

const counts = Object.fromEntries(
  [...new Set(audit.map((item) => item.state))].map((state) => [state, audit.filter((item) => item.state === state).length]),
);
console.log(JSON.stringify({ counts, products: audit }, null, 2));
