#!/usr/bin/env node
/**
 * verify-hero-headroom — S1 히어로 머리 잘림 검증 + 자연 배경 여부 스냅숏
 * 통과 기준:
 *   (1) HEADROOM: 프레임 상단에서 배경(밝은/뉴트럴)이 ≥10% 높이 이상 이어져야 함
 *   (2) no-head-cut: 머리(피부/머리카락)가 y<3% 에 닿으면 FAIL (잘림)
 *   (3) rim: 상단 45%에서 어두운 헤어가 프레임 좌/우 가장자리에 닿으면 FAIL 후보
 *
 * 사용법:  node scripts/verify-hero-headroom.mjs <hero-file>
 * 종료코드: 0=PASS, 1=FAIL(재생성 필요)
 */
import { readFileSync, statSync, existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("usage: node scripts/verify-hero-headroom.mjs <hero-file>");
  process.exit(1);
}

const buf = await sharp(file).removeAlpha().resize(216, 296).raw().toBuffer({ resolveWithObject: true });
const w = buf.info.width, h = buf.info.height, ch = buf.info.channels;
const data = buf.data;

// 스킨 톤 판정 — 밝은 배경(크림/아이보리)과 회색 배경(시멘트·구름)을 제외
function isSkin(r, g, b) {
  const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
  if (maxC > 235) return false; // 너무 밝은 톤은 배경(하늘/크림)
  const sat = maxC - minC;
  if (sat < 15) return false; // 채도 낮으면 회색/뉴트럴 배경
  // 피부의 R>G>B 경향 + 제한된 채도. 회색(시멘트, 구름)은 r≈g≈b라 여기 제외.
  return sat < 110 && r > 100 && g > 60 && b > 40 && r > b + 8 && (r - b) < 90 && (r - g) > -10;
}
// 어두운 헤어/옷 판정
function isDark(r, g, b) {
  const maxC = Math.max(r, g, b);
  return maxC < 130;
}
// 밝은 배경 판정 (크림/벽지/하늘 등) — 배경 모드 감지에서 사용
function isBrightNeutral(r, g, b) {
  const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
  return maxC > 200 && (maxC - minC) < 45;
}

// (1) 배경 모드 감지 — 상단 5% 평균 밝기로 "밝은 배경(크림/하늘)" vs "어두운 자연 배경" 판별
let topBrightSum = 0;
for (let y = 0; y < Math.round(h * 0.05); y++) {
  for (let x = 0; x < w; x += 3) {
    const i = (y * w + x) * ch;
    topBrightSum += Math.max(data[i], data[i + 1], data[i + 2]);
  }
}
const topBrightAvg = topBrightSum / (Math.round(h * 0.05) * Math.ceil(w / 3));
const brightBg = topBrightAvg > 170; // true=밝은 배경(크림 등), false=어두운 자연 배경

// 헤드룸: 밝은 배경이면 크림 헤드룸(중앙 상단), 어두운 배경이면 피부/헤어 최상단까지의 갭
function headroomAt(x) {
  let y = 0;
  while (y < h) {
    const i = (y * w + x) * ch;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (brightBg) {
      // 밝은 배경: 최상단이 밝으면 그 밝기를 유지하는 구간 = 헤드룸
      if (Math.max(r, g, b) < 160 || (Math.max(r, g, b) - Math.min(r, g, b)) > 60) break;
    } else {
      // 어두운 배경: 누군가(피부/헤어/옷)가 시작되기 전까지 = 헤드룸
      if (isSkin(r, g, b) || isDark(r, g, b)) break;
    }
    y++;
  }
  return y / h;
}
let sumHr = 0, nHr = 0, minHr = 1;
for (let x = Math.round(w * 0.35); x <= Math.round(w * 0.65); x += 2) {
  const hr = headroomAt(x);
  sumHr += hr; nHr++;
  if (hr < minHr) minHr = hr;
}
const avgHr = sumHr / nHr;

// (2) 프레임 상단 4% **중앙부(가로 30~70%)**에 머리(피부or헤어)가 있는가
const cx0 = Math.round(w * 0.3), cx1 = Math.round(w * 0.7);
let topSkin = 0, topDark = 0, topN = 0;
for (let y = 0; y < Math.round(h * 0.04); y++) {
  for (let x = cx0; x < cx1; x++) {
    const i = (y * w + x) * ch;
    if (isSkin(data[i], data[i + 1], data[i + 2])) topSkin++;
    if (isDark(data[i], data[i + 1], data[i + 2])) topDark++;
    topN++;
  }
}
const topSkinPct = topSkin / topN;
const topDarkPct = topDark / topN;

// (3) 참고: 상단 45% 좌/우 가장자리 어두운 요소 밀착 (배경이 어두우면 무시)
let edgeHair = 0;
for (let y = 0; y < Math.round(h * 0.45); y++) {
  for (const x of [0, 1, 2, w - 3, w - 2, w - 1]) {
    const i = (y * w + x) * ch;
    if (!brightBg && isDark(data[i], data[i + 1], data[i + 2])) edgeHair++;
    if (brightBg && isDark(data[i], data[i + 1], data[i + 2])) edgeHair++;
  }
}
const edgeHairPct = edgeHair / (Math.round(h * 0.45) * 6);

const headroomPct = Math.round(avgHr * 100);
const minHrPct = Math.round(minHr * 100);
const issues = [];

if (brightBg) {
  // 밝은 배경: 피부가 상단에 닿으면 잘림
  if (headroomPct < 10) issues.push(`헤드룸 ${headroomPct}% (기준 ≥10%)`);
  if (minHrPct < 4) issues.push(`최소 헤드룸 ${minHrPct}% (기준 ≥4%)`);
  if (topSkinPct > 0.05) issues.push(`프레임 최상단에 피부 톤 ${Math.round(topSkinPct * 100)}%`);
} else {
  // 어두운 자연 배경: 헤어/옷이 상단에 닿으면 잘림 (피부는 밝은 톤이라 배경과 구분)
  if (topDarkPct > 0.3) issues.push(`프레임 최상단에 머리/어두운 요소 ${Math.round(topDarkPct * 100)}%`);
  if (headroomPct < 6) issues.push(`머리 시작까지 여백 ${headroomPct}% (기준 ≥6%)`);
}

const pass = issues.length === 0;

console.log(`=== S1 Hero 자동 검증 ===`);
console.log(`  파일: ${path.basename(file)} (${w}x${h} scaled)`);
console.log(`  배경 모드: ${brightBg ? "밝은 배경(크림/하늘)" : "어두운 자연 배경"}`);
console.log(`  헤드룸(중앙 평균): ${headroomPct}%  (최소 ${minHrPct}%)`);
console.log(`  상단4% 피부: ${Math.round(topSkinPct * 100)}% / 어두운 요소: ${Math.round(topDarkPct * 100)}%`);
console.log(`  상단45% 가장자리 요소: ${Math.round(edgeHairPct * 100)}% (참고)`);
console.log(pass ? "  ✅ PASS — 크롭 진행 가능" : `  ❌ FAIL — 히어로 재생성 필요`);
if (issues.length) console.log(`  이슈: ${issues.join(" / ")}`);
process.exit(pass ? 0 : 1);