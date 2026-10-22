/**
 * Generate English Shopee SEA listing drafts from the verified-shape catalogue.
 * Drafts are reviewable only: source photos, variants, category and logistics
 * must be verified per marketplace before any Open Platform call.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const amazonDrafts = JSON.parse(fs.readFileSync(path.join(root, "docs/amazon-au-womens-listing-drafts.json"), "utf8"));
const markets = [
  { code: "SG", currency: "SGD", rate: 1.35, label: "Singapore" },
  { code: "MY", currency: "MYR", rate: 4.7, label: "Malaysia" },
  { code: "TH", currency: "THB", rate: 36, label: "Thailand" },
  { code: "VN", currency: "VND", rate: 25000, label: "Vietnam" },
  { code: "PH", currency: "PHP", rate: 58, label: "Philippines" },
  { code: "ID", currency: "IDR", rate: 16000, label: "Indonesia" },
];

const usdFromAud = (aud) => Number(aud) / 1.55;
const localPrice = (usd, market) => {
  const value = usd * market.rate;
  return market.currency === "VND" || market.currency === "IDR" ? Math.round(value) : Number(value.toFixed(2));
};
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const drafts = [];

for (const product of amazonDrafts.products) {
  const usd = usdFromAud(product.offer.suggestedAud);
  for (const market of markets) {
    const itemName = product.copy.itemName.slice(0, 120);
    drafts.push({
      draftId: `SHOPEE-${market.code}-${product.skuSeed}`,
      marketplace: market.code,
      country: market.label,
      currency: market.currency,
      locale: "en",
      status: "CONCEPT",
      skuSeed: product.skuSeed,
      source: product.source,
      listing: {
        itemName,
        description: `${product.copy.description} Please review the selected colour and size before checkout.`,
        searchTerms: product.copy.searchTerms,
        suggestedPrice: localPrice(usd, market),
        stock: null,
        itemStatus: "NORMAL",
      },
      variations: {
        theme: "SIZE/COLOR",
        values: [],
        status: "UNVERIFIED",
        note: "Populate only from the verified supplier variant and size chart.",
      },
      shipping: {
        logisticId: null,
        status: "UNVERIFIED",
        note: `Select an enabled ${market.label} Shopee logistics channel before publishing.`,
      },
      category: {
        categoryId: null,
        status: "UNVERIFIED",
        note: "Resolve the local Shopee fashion category through Seller/Open Platform metadata.",
      },
      images: [
        { slot: "M0", role: "main", status: "NEEDS_SOURCE", note: "Verified product image, accurate colour, no text overlay." },
        { slot: "M1", role: "lifestyle", status: "NEEDS_SOURCE", note: "Use only after the garment matches the source SKU." },
        { slot: "M2", role: "detail", status: "NEEDS_SOURCE", note: "Show visible construction from the original gallery." },
        { slot: "M3", role: "size-guide", status: "NEEDS_SOURCE", note: "Typeset actual measurements; do not convert by guesswork." },
      ],
      gates: {
        sourceMatch: "BLOCKED",
        category: "BLOCKED",
        logistics: "BLOCKED",
        validationPreview: "NOT_RUN",
        liveListing: "NOT_RUN",
      },
    });
  }
}

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  channel: "shopee",
  locale: "en",
  markets: markets.map(({ code, currency, label }) => ({ code, currency, label })),
  sourceCount: amazonDrafts.products.length,
  listingCount: drafts.length,
  status: "CONCEPT",
  products: drafts,
};
const jsonPath = path.join(root, "docs/shopee-sea-womens-listing-drafts.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cards = drafts.map((p) => `<article><p class="status">${esc(p.marketplace)} · CONCEPT · SOURCE UNVERIFIED</p><h2>${esc(p.listing.itemName)}</h2><p>${esc(p.listing.description)}</p><p class="price">Suggested ${esc(p.currency)} ${p.listing.suggestedPrice}</p><p class="meta">${esc(p.source.categoryPath.join(" / "))} · SKU seed: ${esc(p.skuSeed)} · Category and logistics: verify</p></article>`).join("\n");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXI Shopee SEA Women's Drafts</title><style>body{margin:0;background:#f5f2ed;color:#202020;font:15px/1.6 Arial,sans-serif}main{max-width:960px;margin:auto;padding:28px 18px}article{background:#fff;margin:0 0 14px;padding:20px;border-radius:12px;box-shadow:0 2px 10px #0001}h1{font-size:30px}h2{font-size:19px;margin:4px 0 10px}.status{color:#bd503e;font-size:11px;font-weight:700;letter-spacing:.08em}.price{font-weight:700}.meta{color:#666;font-size:12px;border-top:1px solid #eee;padding-top:10px}</style><main><h1>LEXI · Shopee SEA Women's English Drafts</h1><p>English listing copy for Singapore, Malaysia, Thailand, Vietnam, the Philippines and Indonesia. Every draft remains CONCEPT until source images, local category, enabled logistics, variants and stock are verified.</p>${cards}</main></html>`;
const htmlPath = path.join(root, "public/pdp-preview/shopee-sea-womens-drafts.html");
fs.writeFileSync(htmlPath, html);
console.log(JSON.stringify({ sourceCount: amazonDrafts.products.length, listingCount: drafts.length, json: path.relative(root, jsonPath), preview: path.relative(root, htmlPath) }));
