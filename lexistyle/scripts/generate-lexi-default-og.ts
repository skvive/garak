/**
 * Regenerate site-default LEXI OG only (Korean line fix).
 * Usage: npx tsx scripts/generate-lexi-default-og.ts
 */
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { wanImageProvider } from "../src/lib/wan/image";

loadEnv({ path: join(process.cwd(), ".env") });

async function main() {
  const prompt = `Create a premium LEXI brand Open Graph share image, 16:9 landscape (~1200x630).
Cream paper (#faf9f7) full bleed with soft warm grain.
Large left-weighted "LEXI." wordmark in ink black with coral accent period (#e85d4c).
Short Korean line exactly: "담백한 설렘을 입는 방법" - clean sans, small.
Partial soft fashion figure on the right margin - cream pleats, quiet luxury.
No fake stars, prices, watermarks, purple gradients, or emoji.`;

  console.log("generating…");
  const img = await wanImageProvider.textToImage(prompt, { size: "landscape" });
  const buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
  const out = join(process.cwd(), "scripts", "out", "lexi-og");
  const pub = join(process.cwd(), "public", "og");
  mkdirSync(out, { recursive: true });
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(out, "lexi-default-og.png"), buf);
  const sharp = (await import("sharp")).default;
  await sharp(buf).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 86 }).toFile(join(pub, "lexi-default.jpg"));
  writeFileSync(join(pub, "lexi-default.png"), buf);
  console.log("OK", img.url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
