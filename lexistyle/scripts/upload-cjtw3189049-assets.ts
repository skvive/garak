import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { put } from "@vercel/blob";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public/pdp/cjtw3189049-sport-set");
const files = [
  "coupang-main.jpg",
  "hero-brown.jpg",
  "hero-sky.jpg",
  "hero-purple.jpg",
  "product-brown.jpg",
  "product-sky.jpg",
  "product-purple.jpg",
  "detail-hoodie.jpg",
  "detail-pocket.jpg",
  "detail-pants.jpg",
  "look-brown-upper.jpg",
  "size-top.jpg",
  "size-pants.jpg",
];

async function main() {
  const uploaded: Record<string, string> = {};
  for (const file of files) {
    const body = await readFile(path.join(DIR, file));
    const blob = await put(`coupang/CJTW3189049/${file}`, body, {
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
