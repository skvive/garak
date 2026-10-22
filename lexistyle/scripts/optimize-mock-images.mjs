#!/usr/bin/env node
/**
 * SAMPLE3 mock 이미지 최적화 — 4:5 / 1:1 정확 크롭 + WebP 품질 70 (용량 최적화)
 * public/sample3/mock- 폴더들 assets 웹픽 + og-opt 일괄
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = "e:/cursor_HS/lexistyle/public/sample3";
const SPECS = {
  "s1-hero-opt.webp": { w: 800, h: 1000, fit: "cover" },
  "s3-desire-opt.webp": { w: 800, h: 1000, fit: "cover" },
  "s2-detail-opt.webp": { w: 640, h: 640, fit: "cover" },
  "og-opt.webp": { w: 1200, h: 630, fit: "cover" },
};
const DEFAULT = { w: 800, h: 1000, fit: "cover" };

async function squeeze(file, spec) {
  const before = fs.statSync(file).size;
  const src = fs.readFileSync(file);
  let q = 70;
  let buf;
  for (let attempts = 0; attempts < 4; attempts++) {
    buf = await sharp(src)
      .rotate()
      .resize(spec.w, spec.h, { fit: spec.fit, position: "centre", withoutEnlargement: false })
      .webp({ quality: q, alphaQuality: 80, effort: 6 })
      .toBuffer();
    if (buf.length <= 35_000 || q <= 60) break;
    q -= 5;
  }
  fs.writeFileSync(file, buf);
  const after = fs.statSync(file).size;
  return {
    name: path.basename(file),
    beforeKB: Math.round(before / 1024),
    afterKB: Math.round(after / 1024),
    saved: Math.round(((before - after) / before) * 100),
  };
}

async function main() {
  const dirs = fs.readdirSync(ROOT).filter((d) => d.startsWith("mock-"));
  const total = { before: 0, after: 0, files: 0 };
  for (const d of dirs) {
    const base = path.join(ROOT, d);
    const assets = path.join(base, "assets");
    const files = [
      ...(fs.existsSync(assets) ? fs.readdirSync(assets).filter((f) => f.endsWith(".webp")).map((f) => path.join(assets, f)) : []),
      path.join(base, "og-opt.webp"),
    ].filter((f) => fs.existsSync(f));
    for (const file of files) {
      try {
        const name = path.basename(file);
        const spec = SPECS[name] || DEFAULT;
        const r = await squeeze(file, spec);
        total.before += r.beforeKB;
        total.after += r.afterKB;
        total.files += 1;
        console.log(`${d.substring(0, 30).padEnd(32)} ${r.name.padEnd(20)} ${r.beforeKB}KB -> ${r.afterKB}KB (${r.saved}%↓)`);
      } catch (e) {
        console.log(`${d} ${path.basename(file)}: skip (${e.message.slice(0, 40)})`);
      }
    }
  }
  console.log(`\n=== TOTAL: ${total.files} files, ${total.before}KB -> ${total.after}KB (${Math.round(((total.before - total.after) / total.before) * 100)}%↓) ===`);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});