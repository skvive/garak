#!/usr/bin/env node
/**
 * pdp-live — SAMPLE3 상품페이지 작업 상태를 tmp/pdp-live.json 에 기록
 * VSCode 미리보기 창(/preview)이 이 파일을 읽어 3초마다 실시간 갱신한다.
 *
 * 사용법:
 *   node scripts/pdp-live.mjs --sku <dir> --slug <slug> --title <ko> --amba <name> --step <적용단계> [--product-url <url>]
 *
 * --step 예: source(원본확보) / hero(히어로생성) / crops(크롭완료) / override(오버라이드) / check(로컬검증) / live(라이브확인)
 * public/pdp/<sku>/ 의 hero-v1/detail-v1/silhouette-v1/og-v1.webp 존재 여부를 자동 감지한다.
 */
import { readFileSync, writeFileSync, statSync, mkdirSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const STATE = path.join(ROOT, "tmp", "pdp-live.json");
const PDP_DIR = path.join(ROOT, "public", "pdp");

function parseArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || i + 1 >= process.argv.length) return "";
  return process.argv[i + 1].trim();
}

function loadPrev() {
  try {
    return JSON.parse(readFileSync(STATE, "utf8"));
  } catch {
    return {};
  }
}

function assetExists(sku, file) {
  try {
    return statSync(path.join(PDP_DIR, sku, file)).size > 0;
  } catch {
    return false;
  }
}

const sku = parseArg("sku").replace(/^\/+|\/+$/g, "");
const slug = parseArg("slug");
const title = parseArg("title");
const amba = parseArg("amba");
const step = parseArg("step");
const productUrl = parseArg("product-url");

if (!sku) {
  console.error("usage: node scripts/pdp-live.mjs --sku <dir> [--slug ..] [--title ..] [--amba ..] [--step ..] [--product-url ..]");
  process.exit(1);
}

const prev = loadPrev();
const now = new Date().toISOString().slice(0, 19).replace("T", " ");

const state = {
  updatedAt: now,
  sku,
  slug: slug || prev.slug || "",
  title: title || prev.title || "",
  amba: amba || prev.amba || "",
  step: step || prev.step || "",
  productUrl: productUrl || prev.productUrl || "",
  assets: {
    hero: assetExists(sku, "hero-v1.webp"),
    detail: assetExists(sku, "detail-v1.webp"),
    silhouette: assetExists(sku, "silhouette-v1.webp"),
    og: assetExists(sku, "og-v1.webp"),
  },
  history: (prev.history ?? []).slice(-60),
};

if (step && step !== prev.step) {
  state.history.push({ at: now, step, sku, title: title || prev.title || "" });
}

mkdirSync(path.dirname(STATE), { recursive: true });
writeFileSync(STATE, JSON.stringify(state, null, 2), "utf8");

console.log(`✓ pdp-live updated: ${now}`);
console.log(`  sku=${sku} step=${step || "(유지)"}`);
console.log(`  assets hero=${state.assets.hero} detail=${state.assets.detail} silhouette=${state.assets.silhouette} og=${state.assets.og}`);
console.log(`  미리보기: http://localhost:3000/preview`);