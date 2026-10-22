#!/usr/bin/env node
/**
 * Rebuild LEXI knit promo with brand typography + fades.
 * Sources: s1/s2/s3 clips → branded 합본.
 */
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(dir, "out", "lexi-knit-promo");
const font = "C\\:/Windows/Fonts/malgunbd.ttf";

const clips = ["s1-hero.mp4", "s2-detail.mp4", "s3-desire.mp4"].map((f) => join(outDir, f));
for (const c of clips) {
  if (!existsSync(c)) {
    console.error("missing", c);
    process.exit(1);
  }
}

const listPath = join(outDir, "concat-brand.txt");
writeFileSync(
  listPath,
  clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n") + "\n",
  "utf8",
);

const raw = join(outDir, "lexi-knit-promo-raw.mp4");
const branded = join(outDir, "lexi-knit-promo.mp4");
const ass = join(outDir, "lexi-brand.ass").replace(/\\/g, "/").replace(":", "\\:");

function run(cmd, args) {
  console.log(cmd, args.join(" "));
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 1) concat scenes
run("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  listPath,
  "-c",
  "copy",
  raw,
]);

// 2) brand grade + ASS burn-in + soft vignette + intro/outro padding feel via fades on clip
// ASS path for ffmpeg on Windows needs escaping
const assFilter = `ass='${ass}'`;
const vf = [
  "fade=t=in:st=0:d=0.4",
  "fade=t=out:st=17.9:d=0.7",
  "eq=contrast=1.05:saturation=1.08:brightness=0.02",
  "vignette=PI/5",
  assFilter,
].join(",");

run("ffmpeg", [
  "-y",
  "-i",
  raw,
  "-vf",
  vf,
  "-c:v",
  "libx264",
  "-crf",
  "20",
  "-preset",
  "medium",
  "-movflags",
  "+faststart",
  "-an",
  "-t",
  "18.5",
  branded,
]);

console.log("WROTE", branded);
