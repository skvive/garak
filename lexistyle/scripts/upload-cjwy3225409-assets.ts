/**
 * 쿠팡 Wing용 Blob 업로드 — CJWY3225409 골지 모크넥 스웨트셔츠
 * Usage: npx tsx scripts/upload-cjwy3225409-assets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjwy3225409-sweatshirt");
const files = [
  "coupang-main.jpg",
  "hero-black.jpg",
  "hero-white.jpg",
  "hero-dark-gray.jpg",
  "hero-army-green.jpg",
  "hero-khaki.jpg",
  "product-black.jpg",
  "product-white.jpg",
  "product-dark-gray.jpg",
  "product-army-green.jpg",
  "product-khaki.jpg",
  "look-black-upper.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJWY3225409/${file}`, body, {
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
