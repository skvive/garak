import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCjProductDetail } from "../src/lib/sourcing/connectors/cjdropshipping";

const PID = "1569204657103319040";
const OUT = path.resolve("tmp/pdp-source/CJQB156210006FU-originals");

function imageUrls(value: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => imageUrls(item, acc));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => imageUrls(item, acc));
  else if (typeof value === "string") {
    let candidate: unknown = value;
    if (value.trim().startsWith("[")) {
      try { candidate = JSON.parse(value); } catch { /* plain string */ }
    }
    if (candidate !== value) imageUrls(candidate, acc);
    else {
      for (const match of value.matchAll(/https?:\/\/[^\s"'<>\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>\\]*)?/gi)) {
        acc.add(match[0]);
      }
    }
  }
  return acc;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const product = await getCjProductDetail(PID);
  if (!product) throw new Error("CJ product detail unavailable");
  await writeFile(path.join(OUT, "product.json"), JSON.stringify(product, null, 2));
  const urls = [...imageUrls(product)];
  const manifest: Array<{ file: string; url: string; bytes: number }> = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const ext = new URL(url).pathname.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() ?? "jpg";
    const file = `original-${String(i + 1).padStart(2, "0")}.${ext}`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path.join(OUT, file), bytes);
    manifest.push({ file, url, bytes: bytes.length });
  }
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ pid: PID, found: urls.length, downloaded: manifest.length, out: OUT }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
