import { writeFile } from "node:fs/promises";

const url = process.argv[2] ?? "https://style.lexid.site/ko/category/fashion?page=2";
const out = process.argv[3] ?? "tmp/fashion-page-2-products.json";

const response = await fetch(url);
if (!response.ok) throw new Error(`fetch failed: ${response.status} ${url}`);
const html = await response.text();

function textOnly(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const found = new Map();
const anchorPattern = /<a\b[^>]*href="([^"]*\/product\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
for (const match of html.matchAll(anchorPattern)) {
  const href = new URL(match[1], url).pathname;
  if (found.has(href)) continue;
  const cardText = textOnly(match[2]);
  const title = cardText
    .replace(/^BEST\s*/i, "")
    .split(/(?=\d{1,3}(?:,\d{3})*원)|(?=\$\d)/)[0]
    .trim();
  if (!title) continue;
  found.set(href, { index: found.size + 1, href, slug: href.split("/").pop(), title, cardText });
}

const products = [...found.values()];
await writeFile(out, `${JSON.stringify({ sourceUrl: url, count: products.length, products }, null, 2)}\n`, "utf8");
console.log(`wrote ${products.length} products to ${out}`);
for (const product of products) console.log(`${String(product.index).padStart(2, "0")}\t${product.title}\t${product.slug}`);
