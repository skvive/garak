// 가락한상 모바일 UI 종합 감사 스크립트
// 전 핵심 페이지를 375px/430px에서 검증: 가로 넘침·하단 탭·핵심 요소·콘솔 오류 + 스크린샷
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 9333;
const CDP = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.TEMP || "/tmp", "garak-shot-profile");
const BASE = "http://localhost:3000/ko";
const OUT_DIR = "E:/currsor_C/lawsign/garak-hansang/docs/screenshots/mobile-audit";

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
  } catch {
    return false;
  }
};

if (!(await cdpUp())) {
  const child = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${PROFILE}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=440,960",
      "about:blank",
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  for (let i = 0; i < 40 && !(await cdpUp()); i++) await sleep(500);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 150));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 150)));

const PAGES = [
  { name: "home", path: "/" },
  { name: "category", path: "/category" },
  { name: "category-beauty", path: "/category/beauty" },
  { name: "best", path: "/best" },
  { name: "product", path: "/product/bangeo-hoe" },
  { name: "cart", path: "/cart" },
  { name: "search", path: "/search" },
  { name: "account", path: "/account" },
];

const results = [];

for (const width of [375, 430]) {
  await page.setViewportSize({ width, height: width === 375 ? 812 : 932 });
  for (const p of PAGES) {
    consoleErrors.length = 0;
    let status = "OK";
    try {
      await page.goto(BASE + p.path, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(4500);
    } catch (e) {
      status = "NAV_FAIL: " + String(e).slice(0, 80);
    }
    let audit = null;
    if (status === "OK") {
      audit = await page.evaluate(() => {
        const vw = window.innerWidth;
        const overflow = document.documentElement.scrollWidth - vw;
        const tab = document.querySelector("nav[aria-label='하단 탭']");
        const tabRect = tab?.getBoundingClientRect();
        const tabFixed = tab ? getComputedStyle(tab).position === "fixed" : false;
        const h1 = document.querySelector("h1");
        return {
          title: document.title.slice(0, 40),
          overflowPx: overflow,
          hasOverflow: overflow > 2,
          bottomTabVisible: !!tabRect && tabRect.bottom > window.innerHeight - 90 && tabRect.bottom <= window.innerHeight + 2,
          bottomTabFixed: tabFixed,
          h1Text: h1 ? h1.textContent.replace(/\s+/g, " ").trim().slice(0, 60) : null,
          productCards: document.querySelectorAll("a[href^='/product/']").length,
          images: document.images.length,
        };
      });
    }
    const shotName = `${p.name}-${width}.png`;
    if (status === "OK") {
      await page.screenshot({ path: path.join(OUT_DIR, shotName) });
    }
    results.push({
      page: p.name,
      width,
      status,
      ...(audit ?? {}),
      consoleErrors: consoleErrors.slice(0, 3),
      screenshot: shotName,
    });
  }
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
process.exit(0);
