import fs from "node:fs/promises";
import path from "node:path";

const manifestPath = process.argv[2] || "tmp/fashion-page-2-women.json";
const outputDir = process.argv[3] || "tmp/pdp-source/fashion-page2";
const products = JSON.parse(await fs.readFile(manifestPath, "utf8"));
await fs.mkdir(outputDir, { recursive: true });

let completed = 0;
const failed = [];
for (const product of products) {
  try {
    const response = await fetch(product.primaryThumbUrl, {
      headers: { "user-agent": "Mozilla/5.0 LEXI-PDP-Source/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const filename = `${String(product.index).padStart(2, "0")}-${product.catalogId}-original.${ext}`;
    await fs.writeFile(path.join(outputDir, filename), Buffer.from(await response.arrayBuffer()));
    product.sourceImagePath = path.resolve(outputDir, filename);
    completed += 1;
    console.log(`[${completed}/${products.length}] ${filename}`);
  } catch (error) {
    failed.push({ catalogId: product.catalogId, message: error.message });
  }
}

await fs.writeFile(manifestPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(JSON.stringify({ completed, failed }));
if (failed.length) process.exitCode = 1;
