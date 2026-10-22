import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjls3061165-pink-tweed");
const files = [
  "coupang-main.jpg",
  "hero.jpg",
  "hero-detail.jpg",
  "jacket.jpg",
  "dress.jpg",
  "original-look.jpg",
  "trim-detail.jpg",
  "texture-detail.jpg",
  "size-chart.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const blob = await put(`coupang/CJLS3061165/${file}`, await readFile(path.join(DIR, file)), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/jpeg",
    });
    uploaded[file] = blob.url;
  }
  await writeFile(path.join(DIR, "remote-assets.json"), JSON.stringify(uploaded, null, 2));
  console.log(JSON.stringify({ uploaded: files.length, urls: uploaded }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
