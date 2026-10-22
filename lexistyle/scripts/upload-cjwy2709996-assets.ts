/**
 * 쿠팡 Wing용 Blob 업로드 — CJWY2709996 후드 니트 가디건
 * Usage: npx tsx scripts/upload-cjwy2709996-assets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjwy2709996-cardigan");
const files = [
  "coupang-main.jpg",
  "hero-ivory.jpg",
  "hero-pink.jpg",
  "hero-orange.jpg",
  "hero-grey.jpg",
  "hero-red.jpg",
  "hero-charcoal.jpg",
  "product-pink.jpg",
  "product-orange.jpg",
  "product-grey.jpg",
  "product-ivory.jpg",
  "product-red.jpg",
  "product-charcoal.jpg",
  "detail-hood.jpg",
  "detail-button.jpg",
  "detail-cuff.jpg",
  "look-ivory-upper.jpg",
  "size-chart.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJWY2709996/${file}`, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/jpeg",
    });
    uploaded[file] = blob.url;
    console.log("ok", file);
  }
  await writeFile(path.join(DIR, "remote-assets.json"), JSON.stringify(uploaded, null, 2));
  console.log(JSON.stringify({ uploaded: Object.keys(uploaded).length }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
