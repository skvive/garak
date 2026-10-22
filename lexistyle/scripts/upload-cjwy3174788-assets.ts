/**
 * 쿠팡 Wing용 Blob 업로드 — CJWY3174788 기모 반집업 모크넥 스웨터
 * Usage: npx tsx scripts/upload-cjwy3174788-assets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjwy3174788-mock-neck");
const files = [
  "coupang-main.jpg",
  "hero-black.jpg",
  "hero-beige.jpg",
  "hero-blue.jpg",
  "product-black.jpg",
  "product-beige.jpg",
  "product-blue.jpg",
  "look-black-upper.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJWY3174788/${file}`, body, {
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
