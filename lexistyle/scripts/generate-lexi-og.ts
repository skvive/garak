/**
 * Refined LEXI OG cards — sample3 product + site default.
 * Usage: npx tsx scripts/generate-lexi-og.ts
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { wanImageProvider } from "../src/lib/wan/image";
import { SAMPLE3_OG_PROMPT_TEMPLATE } from "../src/lib/hq/seeds/sample3-style";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "lexi-og");
const SAMPLE3 = join(process.cwd(), "public", "sample3");
const OG_DIR = join(process.cwd(), "public", "og");

const PROMPTS = {
  sample3: SAMPLE3_OG_PROMPT_TEMPLATE(
    "하트 자수 통기 반팔 티",
    `young East-Asian woman in matte black crew-neck tee with tiny soft-pink heart embroidery and small LEXI wordmark on left chest, waist-up editorial crop, soft window light`,
  ) + `

Upgrade for premium share card:
- Asymmetric editorial layout: left third typography zone, right two-thirds product photo with soft vignette edge into cream paper.
- "LEXI." wordmark large, refined geometric sans, coral period (#e85d4c), generous tracking.
- Subtle thin hairline rules, no clutter, no price, no stars, no badges.
- Photoreal fashion photography integrated into the card, not a collage of screenshots.
- 16:9 landscape ~1200×630.`,

  siteDefault: `Create a premium LEXI brand Open Graph share image, 16:9 landscape (~1200×630).
Cream paper (#faf9f7) full bleed with soft warm grain.
Large centered or left-weighted "LEXI." wordmark in ink black with coral accent period (#e85d4c).
Short supporting line in Korean: "담백한 설렘을 입는 방법" — clean sans, small.
Optional faint editorial fashion silhouette or soft fabric texture in the right margin — abstract, not a busy product collage.
No fake stars, prices, watermarks, purple gradients, or emoji.
Quiet luxury K-fashion commerce mood.`,
} as const;

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function toJpg(srcPng: string, destJpg: string) {
  const sharp = (await import("sharp")).default;
  await sharp(srcPng).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 86 }).toFile(destJpg);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SAMPLE3, { recursive: true });
  mkdirSync(OG_DIR, { recursive: true });

  console.log("[1/2] sample3 OG…");
  const s3 = await wanImageProvider.textToImage(PROMPTS.sample3, { size: "landscape" });
  const s3Png = join(OUT, "sample3-og.png");
  await download(s3.url, s3Png);
  await toJpg(s3Png, join(SAMPLE3, "og.jpg"));
  copyFileSync(s3Png, join(SAMPLE3, "og.png"));
  console.log("sample3", s3.url);

  console.log("[2/2] site default OG…");
  const def = await wanImageProvider.textToImage(PROMPTS.siteDefault, { size: "landscape" });
  const defPng = join(OUT, "lexi-default-og.png");
  await download(def.url, defPng);
  await toJpg(defPng, join(OG_DIR, "lexi-default.jpg"));
  copyFileSync(defPng, join(OG_DIR, "lexi-default.png"));
  console.log("default", def.url);

  writeFileSync(
    join(OUT, "meta.json"),
    JSON.stringify({ sample3: s3.url, siteDefault: def.url, at: new Date().toISOString() }, null, 2),
  );
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
