// 가락한상 쇼핑몰 스크린샷 검증 스크립트 (검증용 임시 도구)
// 시스템 Chrome을 CDP로 띄워 모바일/데스크톱 화면을 캡처한다.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 9333;
const CDP = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.TEMP || "/tmp", "garak-shot-profile");
const OUT_DIR = "E:/currsor_C/lawsign/garak-hansang/docs/screenshots";
const URL = "http://localhost:3000/ko";

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge not found");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdpUp = async () => {
  try {
    const res = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const child = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--window-size=440,960",
    "about:blank",
  ],
  { detached: true, stdio: "ignore" },
);
child.unref();

for (let i = 0; i < 40 && !(await cdpUp()); i++) await sleep(500);
if (!(await cdpUp())) throw new Error("CDP not up");

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());

// ── 모바일 (430×932) ──
await page.setViewportSize({ width: 430, height: 932 });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: path.join(OUT_DIR, "home-mobile.png") });
console.log("shot: home-mobile.png");

// ── 모바일 스크롤 (티커~카테고리 칩 구간) ──
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT_DIR, "home-mobile-scroll.png") });
console.log("shot: home-mobile-scroll.png");

// ── 데스크톱 (1280×900) ──
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: path.join(OUT_DIR, "home-desktop.png") });
console.log("shot: home-desktop.png");

// ── 상품 상세 (데스크톱) ──
await page.goto(`${URL}/product/bangeo-hoe`, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: path.join(OUT_DIR, "product-bangeo.png") });
console.log("shot: product-bangeo.png");

await browser.close();
console.log("done");
process.exit(0);
