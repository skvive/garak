/**
 * LEXI knit-dress promo: ConceptSpec seed + Wan i2v on S1–S3 mocks.
 * Usage: npx tsx scripts/lexi-knit-promo-wan.ts
 */
import { mkdirSync, writeFileSync, createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { config as loadEnv } from "dotenv";
import {
  LEXI_KNIT_DRESS_PRODUCT,
  LEXI_KNIT_DRESS_PUBLIC_URLS,
  lexiKnitDressConceptSpec,
} from "../src/lib/hq/seeds/lexi-knit-dress";
import { createTemplate, updateTemplate } from "../src/lib/factory/store";
import { generateWanImageToVideo, type WanVideoResult } from "../src/lib/wan/video";
import { wanConfigured } from "../src/lib/wan/config";
import { buildMarketingVideoPrompt } from "../src/lib/marketing/wan-prompts";

loadEnv({ path: join(process.cwd(), ".env") });

const OUT = join(process.cwd(), "scripts", "out", "lexi-knit-promo");

const SCENES = [
  {
    id: "s1-hero",
    url: LEXI_KNIT_DRESS_PUBLIC_URLS.s1,
    act: "hero" as const,
    prompt:
      "LEXI brand fashion campaign. Slow cinematic push-in on color-block knit mini dress (black, soft pink, cream). Soft morning light, premium editorial commerce, emphasize LEXI K-fashion mood, gentle fabric motion, no on-screen text, no logos.",
  },
  {
    id: "s2-detail",
    url: LEXI_KNIT_DRESS_PUBLIC_URLS.s2,
    act: "macro" as const,
    prompt:
      "LEXI lookbook detail. Subtle camera drift across rib knit texture and color-block stripes, soft lifestyle light, intimate premium feel for LEXI brand, no text, no watermarks.",
  },
  {
    id: "s3-desire",
    url: LEXI_KNIT_DRESS_PUBLIC_URLS.s3,
    act: "trust" as const,
    prompt:
      "LEXI brand desire shot. Soft walking motion, warm sunset rim light, confident romance, campaign energy for LEXI, cream paper atmosphere, no text, no badges.",
  },
];

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed ${res.status} ${url}`);
  // @ts-expect-error node web stream
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const concept = lexiKnitDressConceptSpec();
  writeFileSync(join(OUT, "concept-spec.json"), JSON.stringify(concept, null, 2), "utf8");

  const template = createTemplate({
    name: "LEXI 배색 니트 미니 원피스",
    createdFromPrompt: "LEXI knit color-block mini dress — Coupang benchmark → editorial",
    tokens: concept.tokens,
    blockPlan: concept.blockPlan,
    imageRecipe: concept.imageRecipe,
    copyRuleset: concept.copyRuleset,
    channelTargets: ["lexi-storefront", "reels"],
    conceptSpec: concept,
    locked: false,
  });
  const locked = updateTemplate(template.id, { locked: true });
  writeFileSync(
    join(OUT, "golden-template.json"),
    JSON.stringify({ product: LEXI_KNIT_DRESS_PRODUCT, template: locked }, null, 2),
    "utf8",
  );
  console.log("[seed] template id=", locked?.id, "locked=", locked?.locked);

  if (!wanConfigured()) {
    console.error("WAN_API_KEY missing — seed written only");
    process.exit(2);
  }

  const results: { id: string; local?: string; remote?: string; error?: string }[] = [];

  for (const scene of SCENES) {
    console.log(`[wan] i2v ${scene.id}…`);
    const frame = scene.url;
    const motion =
      scene.prompt +
      " " +
      buildMarketingVideoPrompt({
        productName: LEXI_KNIT_DRESS_PRODUCT.title,
        act: scene.act,
        brand: "LEXI",
      });
    try {
      const out = (await generateWanImageToVideo(frame, motion, {
        duration: 5,
        resolution: "720P",
        wait: true,
        intervalMs: 10_000,
        maxWaitMs: 600_000,
      })) as WanVideoResult;
      const local = join(OUT, `${scene.id}.mp4`);
      await download(out.url, local);
      results.push({ id: scene.id, local, remote: out.url });
      console.log(`[wan] ok ${scene.id} → ${local}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: scene.id, error: msg });
      console.error(`[wan] fail ${scene.id}:`, msg);
    }
  }

  writeFileSync(join(OUT, "wan-results.json"), JSON.stringify(results, null, 2), "utf8");

  const okClips = results.filter((r) => r.local && existsSync(r.local!));
  writeFileSync(join(OUT, "preview.html"), buildLexiPromoHtml(okClips.map((c) => c.id)), "utf8");
  console.log("[done] clips=", okClips.length, "preview=", join(OUT, "preview.html"));
  if (okClips.length === 0) process.exit(1);
}

function buildLexiPromoHtml(clipIds: string[]): string {
  const videos = clipIds
    .map(
      (id) =>
        `<section class="scene"><video src="./${id}.mp4" muted playsinline autoplay loop></video><div class="cap">${label(id)}</div></section>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>LEXI · Knit Dress Promo</title>
<style>
  :root { word-break: keep-all; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#111;color:#faf9f7;font-family:Pretendard,system-ui,sans-serif;font-size:14px;line-height:1.6}
  .brand{position:fixed;top:16px;left:0;right:0;text-align:center;z-index:10;font-size:28px;font-weight:800;letter-spacing:0.08em}
  .brand span{color:#e85d4c}
  .stack{max-width:420px;margin:64px auto 24px;display:flex;flex-direction:column;gap:20px}
  .scene{position:relative;border-radius:16px;overflow:hidden;background:#1a1a1a;aspect-ratio:9/16}
  video{width:100%;height:100%;object-fit:cover;display:block}
  .cap{position:absolute;left:16px;right:16px;bottom:20px;padding:10px 14px;background:rgba(0,0,0,.55);border-radius:12px;font-weight:600}
  .tag{text-align:center;opacity:.7;margin-bottom:8px}
</style>
</head>
<body>
  <div class="brand">LEXI<span>.</span></div>
  <div class="stack">
    <p class="tag">배색 니트 미니 원피스 · Wan i2v · S1–S3</p>
    ${videos || "<p>클립 생성 실패 — wan-results.json 확인</p>"}
  </div>
</body>
</html>`;
}

function label(id: string) {
  if (id.includes("s1")) return "LEXI Hero · 설렘 실루엣";
  if (id.includes("s2")) return "LEXI Detail · 니트 텍스처";
  return "LEXI Desire · 오늘의 룩";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
