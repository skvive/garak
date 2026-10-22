/**
 * Home hero: LEXI STYLE editorial from brand-mock reference.
 * Usage: npx tsx scripts/generate-home-hero.ts
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { wanImageProvider } from "../src/lib/wan/image";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "home-hero");
const PUB = join(process.cwd(), "public", "hero");

const REF_CANDIDATES = [
  join(process.cwd(), "public", "sample3", "mockups", "brand-mock-b.png"),
  join(process.cwd(), "public", "sample3", "mockups", "brand-mock-b.jpg"),
  join(
    process.env.USERPROFILE || "",
    ".cursor",
    "projects",
    "c-cursor-lexistyle",
    "assets",
    "c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_07ed23a071ab569d3dcf9fcf6e83628c_images_brand-mock-b-acf02cc0-68a4-40d9-8d50-afac0ffcfedd.png",
  ),
];

const REF_URL = "https://lexistyle.vercel.app/sample3/mockups/brand-mock-b.png";

const PROMPT = `Create a premium LEXI STYLE fashion homepage hero, landscape 16:9 cinematic crop (~1920x1080 feel).
Keep the SAME East-Asian woman, face, hair, black LEXI heart-tee (white LEXI wordmark + pink heart on left chest), cafe window light mood from the reference — but reframe as a full-bleed website hero.
Composition: model slightly right of center, generous negative space on the LEFT for large brand typography overlay (leave clean soft area).
Atmosphere: soft morning cafe light, cream-fog editorial, shallow depth of field, K-fashion magazine luxury.
Brand mood: quiet confidence, LEXI STYLE campaign.
No on-image text, no watermarks, no purple gradients, no collage, no black empty placeholder.
Photoreal editorial photography.`;

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUB, { recursive: true });

  let localRef = REF_CANDIDATES.find((p) => existsSync(p));
  if (!localRef) {
    localRef = join(PUB, "ref-lexi-brand-mock-b.png");
    await download(REF_URL, localRef);
  } else {
    copyFileSync(localRef, join(PUB, "ref-lexi-brand-mock-b" + (localRef.endsWith(".jpg") ? ".jpg" : ".png")));
  }

  console.log("ref", localRef);
  console.log("generating hero via editImage…");
  const edited = await wanImageProvider.editImage!(REF_URL, PROMPT);
  const png = join(OUT, "lexi-style-hero.png");
  await download(edited.url, png);

  const sharp = (await import("sharp")).default;
  // top gravity — keep face/hair in frame (centre crop cut the crown)
  await sharp(png)
    .resize(1920, 1080, { fit: "cover", position: "top" })
    .jpeg({ quality: 88 })
    .toFile(join(PUB, "lexi-style-hero.jpg"));
  await sharp(png)
    .resize(1200, 1500, { fit: "cover", position: "top" })
    .jpeg({ quality: 88 })
    .toFile(join(PUB, "lexi-style-hero-portrait.jpg"));
  copyFileSync(png, join(PUB, "lexi-style-hero.png"));

  writeFileSync(join(OUT, "meta.json"), JSON.stringify({ url: edited.url, at: new Date().toISOString() }, null, 2));
  console.log("DONE", join(PUB, "lexi-style-hero.jpg"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
