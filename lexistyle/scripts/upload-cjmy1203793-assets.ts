/**
 * 쿠팡 Wing용 Blob 업로드 — CJMY1203793 확장형 소프트 펫 캐리어
 * Usage: npx tsx scripts/upload-cjmy1203793-assets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjmy1203793-pet-carrier");
const files = [
  "coupang-main.jpg",
  "hero-black.jpg",
  "hero-grey.jpg",
  "hero-green.jpg",
  "hero-orange.jpg",
  "product-black.jpg",
  "product-grey.jpg",
  "product-green.jpg",
  "product-orange.jpg",
  "look-expand.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJMY1203793/${file}`, body, {
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
