/**
 * 쿠팡 Wing용 Blob 업로드 — CJYD2717187 롱 스웨이드 트렌치코트
 * Usage: npx tsx scripts/upload-cjyd2717187-assets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjyd2717187-trench-long");
const files = [
  "coupang-main.jpg",
  "hero-brown.jpg",
  "hero-blue.jpg",
  "hero-grey.jpg",
  "hero-black.jpg",
  "product-brown.jpg",
  "product-blue.jpg",
  "product-grey.jpg",
  "product-black.jpg",
  "look-brown-upper.jpg",
  "size-chart.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJYD2717187/${file}`, body, {
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
