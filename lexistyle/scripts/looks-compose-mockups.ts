/**
 * Generate 2 AI outfit compose mockups for "오늘의 룩" (business casual).
 * Usage: npx tsx scripts/looks-compose-mockups.ts
 */
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { wanImageProvider } from "../src/lib/wan/image";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "looks-compose");
const PUB = join(process.cwd(), "public", "looks", "mockups");

const SHARED = `LEXI editorial lookbook, ONE continuous fashion photograph of ONE East-Asian woman
actually WEARING a full business-casual outfit (not a collage, not floating product photos, not a mannequin silhouette with overlays).
Outfit she wears together:
- powder-blue / light blue classic trench coat (outer)
- soft ivory or white blouse underneath
- coral / salmon wide-leg trousers
- colorful canvas sneakers
- small structured red mini handbag held at her side
Same lighting, same body, garments fitted naturally. Cream-fog editorial, K-fashion magazine quality.
No on-image text, no logos, no product cutout collage, no grey mannequin outline.`;

const PROMPTS = [
  {
    id: "a",
    prompt: `${SHARED}
Pose: three-quarter standing, soft smile, outdoor cafe plaza morning light, shallow depth of field, 3:4 portrait.`,
  },
  {
    id: "b",
    prompt: `${SHARED}
Pose: walking mid-stride toward camera, confident, soft city street dusk light, full-body framing, 3:4 portrait.`,
  },
] as const;

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUB, { recursive: true });
  const meta: { id: string; url: string; file: string }[] = [];

  for (const p of PROMPTS) {
    console.log(`[${p.id}] composing…`);
    const img = await wanImageProvider.textToImage(p.prompt, { size: "portrait" });
    const png = `today-look-compose-${p.id}.png`;
    await download(img.url, join(OUT, png));
    meta.push({ id: p.id, url: img.url, file: png });
    console.log("OK", p.id, img.url);
  }

  // compress jpeg for public
  const sharp = (await import("sharp")).default;
  for (const m of meta) {
    const jpg = `today-look-compose-${m.id}.jpg`;
    await sharp(join(OUT, m.file))
      .resize(900, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(join(PUB, jpg));
    copyFileSync(join(OUT, m.file), join(PUB, m.file));
    console.log("PUB", jpg);
  }

  writeFileSync(join(OUT, "meta.json"), JSON.stringify({ meta }, null, 2));
  writeFileSync(join(PUB, "meta.json"), JSON.stringify({ meta }, null, 2));
  console.log("DONE", PUB);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
