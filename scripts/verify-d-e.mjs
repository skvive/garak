// D/E 단계 검증 — 시세판·초장집 예약·홈마카세·밀집형 카드 뱃지 상호작용 실측
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 9333;
const CDP = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.TEMP || "/tmp", "garak-shot-profile");
const BASE = "http://localhost:3000/ko";
const OUT_DIR = "E:/currsor_C/lawsign/garak-hansang/docs/screenshots/d-e";

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdpUp = async () => {
  try {
    const res = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch { return false; }
};
if (!(await cdpUp())) {
  const child = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check",
    "--window-size=440,960", "about:blank",
  ], { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 40 && !(await cdpUp()); i++) await sleep(500);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());
await page.setViewportSize({ width: 430, height: 932 });

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 140)); });
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 140)));

const report = {};

// ── 시세판 ──
await page.goto(BASE + "/prices", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(5000);
report.prices = await page.evaluate(() => ({
  rows: document.querySelectorAll("a[href^='/product/']").length,
  hasPrevDiff: document.body.innerText.includes("▼") || document.body.innerText.includes("▲"),
  filterChips: [...document.querySelectorAll("a[href^='/prices']")].length,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
}));
await page.screenshot({ path: path.join(OUT_DIR, "prices.png") });

// ── 초장집 예약: 식당·시간 선택 → 신청 → 완료 화면 ──
await page.goto(BASE + "/reservation", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
report.reservationInit = await page.evaluate(() => ({
  restaurants: document.body.innerText.includes("초장집 마루") && document.body.innerText.includes("바다정원 식당"),
  times: ["11:30", "18:00", "20:00"].every((t) => document.body.innerText.includes(t)),
}));
await page.locator("button", { hasText: "18:00" }).first().click();
await page.waitForTimeout(800);
await page.locator("button", { hasText: "예약 신청" }).first().click();
await page.waitForTimeout(1500);
report.reservationDone = await page.evaluate(() => ({
  done: document.body.innerText.includes("예약 신청 완료"),
  hasFee: document.body.innerText.includes("상차림비"),
}));
await page.screenshot({ path: path.join(OUT_DIR, "reservation-done.png") });

// ── 홈마카세 구독: 플랜 선택 → 신청 → 완료 ──
await page.goto(BASE + "/subscription", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
report.subscriptionInit = await page.evaluate(() => ({
  plans: document.body.innerText.includes("주 2회") && document.body.innerText.includes("월 1회"),
  priceShown: document.body.innerText.includes("99,000원"),
}));
await page.locator("button", { hasText: "월 1회" }).first().click();
await page.waitForTimeout(800);
await page.locator("button", { hasText: "구독 시작" }).first().click();
await page.waitForTimeout(1500);
report.subscriptionDone = await page.evaluate(() => ({
  done: document.body.innerText.includes("구독 신청 완료"),
  priceShown: document.body.innerText.includes("119,000원"),
}));
await page.screenshot({ path: path.join(OUT_DIR, "subscription-done.png") });

// ── 밀집형 카드 뱃지 (카테고리 페이지) ──
await page.goto(BASE + "/category/beauty", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(5000);
await page.evaluate(async () => {
  for (let y = 0; y <= document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 250));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(3000);
report.denseBadges = await page.evaluate(() => ({
  gradeA: document.querySelectorAll(".badge-grade-a").length,
  soldout: [...document.querySelectorAll("span")].filter((s) => s.textContent?.includes("SOLDOUT")).length,
  originLines: [...document.querySelectorAll("p")].filter((p) => p.textContent?.startsWith("원산지")).length,
}));
await page.screenshot({ path: path.join(OUT_DIR, "category-dense.png") });

report.consoleErrors = consoleErrors.slice(0, 6);
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(0);
