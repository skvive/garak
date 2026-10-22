/**
 * LEXID landing hero video — Wan i2v from flat-lay reference.
 * Usage: npx tsx scripts/lexid-hero-video.ts
 */
import { mkdirSync, writeFileSync, createWriteStream, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { config as loadEnv } from "dotenv";
import { generateWanImageToVideo, type WanVideoResult } from "../src/lib/wan/video";
import { wanConfigured } from "../src/lib/wan/config";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "lexid-hero");
const REF =
  process.env.LEXID_HERO_REF?.trim() ||
  join(process.cwd(), "public", "sample1", "lexid-hero-ref.png");

const PROMPT = `
Cinematic top-down hero for LEXID, an independent digital-first design studio in Jeju.
Start locked on a curated analog flat-lay: vivid Pantone fan swatches (yellow–orange–red),
beige and grey stone/marble blocks, translucent acrylic sheets in orange red yellow,
a deep blue glass vessel, purple amethyst geode, soft gradient print sheets, tactile fabric.
Soft professional studio light, gentle shadows, photorealistic materials.

Slow seamless metamorphosis: the physical objects float with micro-parallax, edges dissolve
into precise glowing UI wireframes, soft neon grid lines, floating app screens, brand logo
geometry, and clean digital interface panels — analog texture becoming digital grammar.
No readable UI text, no invented logos, no watermarks. Keep center third calm (glass card
safe zone) so a translucent white UI card can sit over the loop. Modern tech-design studio
mood, elegant slow motion, photorealistic.
Brand feeling: refined, editorial, digital-first, writing the grammar of a brand.
`.replace(/\s+/g, " ").trim();

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
  // @ts-expect-error web stream
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!wanConfigured()) throw new Error("WAN_API_KEY missing");
  if (!existsSync(REF)) throw new Error(`ref missing: ${REF}`);

  const buf = readFileSync(REF);
  const frame = `data:image/png;base64,${buf.toString("base64")}`;
  writeFileSync(join(OUT, "prompt.txt"), PROMPT, "utf8");

  console.log("[wan] i2v LEXID hero…");
  const out = (await generateWanImageToVideo(frame, PROMPT, {
    duration: 5,
    resolution: "1080P",
    wait: true,
    intervalMs: 10_000,
    maxWaitMs: 600_000,
  })) as WanVideoResult;

  const local = join(OUT, "lexid-hero.mp4");
  await download(out.url, local);
  writeFileSync(join(OUT, "result.json"), JSON.stringify(out, null, 2), "utf8");
  console.log("WROTE", local);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
