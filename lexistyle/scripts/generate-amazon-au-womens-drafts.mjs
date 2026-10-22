/**
 * Build reviewable Amazon AU en-AU drafts from the existing women's catalogue seed.
 * These are CONCEPT drafts until supplier photos, variants, size charts, stock and
 * Amazon Product Type Definitions are verified. No live Amazon API call is made.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "scripts/genius-batch-womens-100.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const lineRe = /\{ slug: "([^"]+)", title: "([^"]+)", titleKo: "([^"]+)", brand: "([^"]+)", categoryPath: \["([^"]+)", "([^"]+)"\], price: ([0-9.]+)/g;
const rows = [];
let match;
while ((match = lineRe.exec(source))) {
  const [, slug, title, titleKo, brand, department, category, price] = match;
  const categoryName = {
    dresses: "dress",
    tops: "top",
    outerwear: "outerwear",
    bottoms: "bottom",
    knitwear: "knitwear",
    sets: "set",
    sweatshirts: "sweatshirt",
    activewear: "activewear",
    accessories: "accessory",
  }[category] ?? "apparel";
  const titleEn = `LEXI Women's ${title}`.slice(0, 200);
  const aud = Math.round(Number(price) * 1.55 * 100) / 100;
  rows.push({
    skuSeed: `LEXI-${slug}`,
    source: {
      slug,
      titleInternal: title,
      titleKo,
      brand,
      categoryPath: [department, category],
      sourceStatus: "UNVERIFIED",
      sourceRecord: "scripts/genius-batch-womens-100.ts",
    },
    marketplace: "A39IBJ37TRP1C6",
    locale: "en_AU",
    status: "CONCEPT",
    productType: { value: "APPAREL", status: "UNVERIFIED" },
    copy: {
      itemName: titleEn,
      bullets: [
        `A considered ${categoryName} silhouette for everyday wardrobe styling.`,
        `Designed around the listed ${title.toLowerCase()} concept; confirm the final construction against the selected supplier variant.`,
        "Check the seller-provided size chart before ordering.",
        "Colour, fabric and care details are shown only after the selected variant is verified.",
        "See the product images and variation selector for the exact item supplied.",
      ],
      description: `The ${title.toLowerCase()} is prepared for the LEXI women's fashion edit. This Amazon AU copy is a review draft; the final colour, construction, material, care instructions and included pieces must match the verified supplier record before publication.`,
      searchTerms: ["women's fashion", categoryName, "LEXI", "Australian wardrobe"],
    },
    variations: {
      theme: "SIZE/COLOR",
      status: "UNVERIFIED",
      values: [],
      note: "Populate only from the verified supplier variant and size chart.",
    },
    offer: {
      suggestedAud: aud,
      currency: "AUD",
      stock: null,
      fulfilment: "UNVERIFIED",
      note: "Replace with current HQ/CJ price and stock before preview or live listing.",
    },
    images: [
      { slot: "M0", role: "main_product_image", status: "NEEDS_SOURCE", note: "Verified product-only image on white background required." },
      { slot: "M1", role: "lifestyle", status: "NEEDS_SOURCE", note: "Use only after the garment matches the supplier reference." },
      { slot: "M2", role: "construction_detail", status: "NEEDS_SOURCE", note: "Show only visible, verified construction details." },
      { slot: "M3", role: "size_chart", status: "NEEDS_SOURCE", note: "Typeset the actual supplier measurements." },
      { slot: "M4", role: "back_or_side_view", status: "NEEDS_SOURCE", note: "Use the original gallery or a faithful edit." },
      { slot: "M5", role: "variation_guide", status: "NEEDS_SOURCE", note: "Show only actual colours and sizes." },
    ],
    gates: {
      sourceMatch: "BLOCKED",
      productTypeDefinition: "BLOCKED",
      identifierOrExemption: "UNVERIFIED",
      validationPreview: "NOT_RUN",
      liveListing: "NOT_RUN",
    },
  });
}

if (rows.length !== 98) throw new Error(`Expected 98 women's seed rows, found ${rows.length}`);
const outDir = path.join(root, "docs");
const outPath = path.join(outDir, "amazon-au-womens-listing-drafts.json");
fs.writeFileSync(outPath, `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), marketplace: "A39IBJ37TRP1C6", locale: "en_AU", status: "CONCEPT", products: rows }, null, 2)}\n`);

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cards = rows.map((p) => `<article><p class="status">CONCEPT · SOURCE UNVERIFIED</p><h2>${esc(p.copy.itemName)}</h2><p>${esc(p.copy.description)}</p><ul>${p.copy.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p class="meta">SKU seed: ${esc(p.skuSeed)} · Suggested offer: AUD ${p.offer.suggestedAud.toFixed(2)} · Product Type: APPAREL (verify)</p></article>`).join("\n");
const html = `<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXI Amazon AU Women's Drafts</title><style>body{margin:0;background:#f4f1ec;color:#202020;font:16px/1.6 Arial,sans-serif}main{max-width:900px;margin:auto;padding:28px 18px}article{background:#fff;margin:0 0 18px;padding:24px;border-radius:12px;box-shadow:0 2px 12px #0000000d}h1{font-size:30px}h2{font-size:21px;margin:6px 0 12px}.status{color:#b34d3b;font-size:12px;font-weight:700;letter-spacing:.08em}.meta{color:#666;font-size:13px;border-top:1px solid #eee;padding-top:12px}</style><main><h1>LEXI · Amazon AU Women's Listing Drafts</h1><p>English en-AU concept copy for review. Source images, Product Type Definitions, variants, stock and identifiers must be verified before Amazon validation or publication.</p>${cards}</main></html>`;
const htmlPath = path.join(root, "public", "pdp-preview", "amazon-au-womens-drafts.html");
fs.writeFileSync(htmlPath, html);
console.log(JSON.stringify({ products: rows.length, json: path.relative(root, outPath), preview: path.relative(root, htmlPath) }));
