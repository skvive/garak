/**
 * LEXI1 brand mockups (chest LEXI wordmark + heart) ×3 + OG image.
 * Usage: npx tsx scripts/lexi1-brand-mockups.ts
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { wanImageProvider } from "../src/lib/wan/image";
import { LEXI1_PUBLIC_URLS, LEXI1_MOCK_ASSETS } from "../src/lib/hq/seeds/lexi1-heart-tee";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "lexi1-brand-mockups");
const PUB = join(process.cwd(), "public", "sample3");

const HERO =
  process.env.LEXI1_HERO_URL?.trim() ||
  "https://lexistyle.vercel.app/sample3/assets/s1-hero.png";

const MOCKUPS = [
  {
    id: "a",
    label: "Minimal wordmark",
    instruction: `Edit this exact fashion photo. Keep the same model, face, hair, pose, lighting, and black crew-neck tee. On the LEFT CHEST of the tee, add a small elegant embroidered "LEXI" wordmark in soft pink thread (clean sans-serif, letter spacing slightly open), placed ABOVE the existing tiny pink heart embroidery. Keep the heart. Do not add other logos, watermarks, or on-image text. Premium K-fashion editorial look.`,
  },
  {
    id: "b",
    label: "Stacked LEXI + heart",
    instruction: `Edit this exact fashion photo. Keep the same model, face, hair, pose, lighting, and black short-sleeve tee. Centered on the left chest: a refined stacked brand mark — small "LEXI" in soft pink embroidery over the tiny pink heart. Minimal, quiet luxury, no other text or logos. Keep fabric texture and lighting realistic.`,
  },
  {
    id: "c",
    label: "Soft tonal LEXI",
    instruction: `Edit this exact fashion photo. Keep the same model and black tee. Add a subtle tonal "LEXI" embroidered wordmark on the left chest in dusty rose / soft pink, slightly smaller than a coin, with the existing pink heart just below it. Editorial cream-paper mood. No competitor brands, no fake badges, no extra text.`,
  },
] as const;

const OG_PROMPT = `Create a LEXI brand Open Graph social share image, 16:9 landscape, editorial commerce.
Cream paper background (#faf9f7 / warm beige), ink black typography.
Large refined "LEXI" wordmark top-left with coral accent period.
Hero product: young East Asian woman in black crew-neck tee with tiny pink heart and small LEXI embroidery on left chest (same product vibe as K-fashion lookbook).
Soft morning window light, magazine crop, generous negative space for share preview.
Bottom thin line: "하트 자수 통기 반팔 티" in Korean, clean sans.
No fake stars, no price stickers, no watermarks, no purple gradients.`;

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return dest;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(PUB, "assets"), { recursive: true });
  mkdirSync(join(PUB, "mockups"), { recursive: true });

  const localHero = join(process.cwd(), LEXI1_MOCK_ASSETS.s1Hero);
  const heroUrl = existsSync(localHero)
    ? LEXI1_PUBLIC_URLS.s1
    : HERO;

  console.log("[1/4] OG image…");
  const og = await wanImageProvider.textToImage(OG_PROMPT, { size: "landscape" });
  const ogPath = join(OUT, "og-lexi1.png");
  await download(og.url, ogPath);
  copyFileSync(ogPath, join(PUB, "og.png"));
  console.log("OG", og.url);

  const meta: Array<{ id: string; label: string; url: string; file: string }> = [];

  for (let i = 0; i < MOCKUPS.length; i++) {
    const m = MOCKUPS[i]!;
    console.log(`[${i + 2}/4] mockup ${m.id} — ${m.label}…`);
    if (!wanImageProvider.editImage) {
      throw new Error("wan editImage not available");
    }
    const edited = await wanImageProvider.editImage(heroUrl, m.instruction);
    const file = `brand-mock-${m.id}.png`;
    const dest = join(OUT, file);
    await download(edited.url, dest);
    copyFileSync(dest, join(PUB, "mockups", file));
    meta.push({ id: m.id, label: m.label, url: edited.url, file });
    console.log("OK", m.id, edited.url);
  }

  writeFileSync(join(OUT, "meta.json"), JSON.stringify({ heroUrl, og: og.url, mockups: meta }, null, 2));
  writeFileSync(join(PUB, "mockups", "meta.json"), JSON.stringify({ mockups: meta }, null, 2));
  console.log("DONE", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
