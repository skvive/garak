import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjfy3221007-heated-jacket");
const files = [
  "coupang-main.jpg",
  "hero-black.jpg",
  "hero-navy-blue.jpg",
  "hero-army-green.jpg",
  "look-walk.jpg",
  "product-black.jpg",
  "product-navy-blue.jpg",
  "product-army-green.jpg",
  "rep-black.jpg",
  "rep-navy-blue.jpg",
  "rep-army-green.jpg",
  "og.jpg",
  "zone-full.jpg",
  "zone-a.jpg",
  "zone-b.jpg",
  "tech.jpg",
  "dual.jpg",
  "detail-hood.jpg",
  "detail-zipper.jpg",
  "detail-fabric.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const blob = await put(`coupang/CJFY3221007/${file}`, await readFile(path.join(DIR, file)), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.endsWith(".png") ? "image/png" : "image/jpeg",
    });
    uploaded[file] = blob.url;
    console.log(`${file} -> ${blob.url}`);
  }
  await writeFile(path.join(DIR, "remote-assets.json"), JSON.stringify(uploaded, null, 2));
  console.log(JSON.stringify({ uploaded: files.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
