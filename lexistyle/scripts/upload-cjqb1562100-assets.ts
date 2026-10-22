import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjqb1562100-trench");
const files = [
  "coupang-main.jpg",
  "model-editorial.jpg",
  "detail.webp",
  "silhouette.webp",
  "original-grey.jpg",
  "original-black.jpg",
  "original-khaki.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJQB1562100/${file}`, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.endsWith(".webp") ? "image/webp" : "image/jpeg",
    });
    uploaded[file] = blob.url;
  }
  await writeFile(path.join(DIR, "remote-assets.json"), JSON.stringify(uploaded, null, 2));
  console.log(JSON.stringify({ uploaded: Object.keys(uploaded).length, urls: uploaded }, null, 2));
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
