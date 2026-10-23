// 가락한상 E2E 종합 검증 — 이미지·디자인·기능·링크·콘솔 오류 실측
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 9333;
const CDP = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.TEMP || "/tmp", "garak-shot-profile");
const BASE = "http://localhost:3000/ko";
const OUT_DIR = "E:/currsor_C/lawsign/garak-hansang/docs/screenshots/e2e";

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
      `--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check",
      "--window-size=440,960", "about:blank",
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
await page.setViewportSize({ width: 430, height: 932 });

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 160)));

const report = {};

// ── 1. 홈 이미지·디자인 검증 (전체 스크롤로 lazy 이미지 로드 후 검사) ──
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
await page.evaluate(async () => {
  for (let y = 0; y <= document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 350));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(4000);
report.homeImages = await page.evaluate(() => {
  const imgs = [...document.images].map((i) => ({
    src: i.src.replace(/^https?:\/\/[^/]+/, "").slice(0, 70),
    ok: i.complete && i.naturalWidth > 0,
    lazy: i.loading === "lazy",
  }));
  return {
    total: imgs.length,
    broken: imgs.filter((i) => !i.ok),
    okCount: imgs.filter((i) => i.ok).length,
  };
});
report.homeDesign = await page.evaluate(() => {
  const ticker = document.querySelector(".animate-ticker");
  const tab = document.querySelector("nav[aria-label='하단 탭']");
  return {
    tickerAnim: ticker ? getComputedStyle(ticker).animationName : "MISSING",
    tabFixed: tab ? getComputedStyle(tab).position === "fixed" : false,
    heroOverlay: !!document.querySelector(".ocean-hero-overlay"),
    promoCards: document.querySelectorAll("section[aria-label='기획전'] a").length,
    seasonCards: document.querySelectorAll("section[aria-label='제철 추천'] a").length,
    processSteps: document.querySelectorAll("section[aria-label='가락한상 신선 프로세스'] p.text-\\[12px\\]").length,
    countdown: document.querySelector("section[aria-label='당일배송 마감 안내']")?.textContent?.match(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)?.[0] ?? null,
  };
});
await page.screenshot({ path: path.join(OUT_DIR, "home.png") });

// ── 2. 상품 상세: 이미지·구매바·장바구니 담기 ──
await page.goto(BASE + "/product/bangeo-hoe", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
await page.evaluate(async () => {
  for (let y = 0; y <= document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 300));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(3000);
report.pdpImages = await page.evaluate(() => {
  const imgs = [...document.images].map((i) => ({ src: i.src.slice(0, 60), ok: i.complete && i.naturalWidth > 0 }));
  return { total: imgs.length, broken: imgs.filter((i) => !i.ok) };
});
const buyBar = page.locator("button:has-text('담기')").first();
report.buyBarVisible = await buyBar.isVisible().catch(() => false);
if (report.buyBarVisible) {
  await buyBar.click();
  await page.waitForTimeout(3500);
  report.buyBarMsg = (await page.locator("body").innerText()).match(/.{0,30}담았습니다|선택해 주세요.{0,20}/)?.[0] ?? null;
  report.cartAfterAdd = await page.evaluate(async () => {
    const r = await fetch("/api/cart");
    const d = await r.json();
    return { status: r.status, items: (d.items ?? []).length, slugs: (d.items ?? []).map((i) => i.slug) };
  });
}
await page.screenshot({ path: path.join(OUT_DIR, "pdp.png") });

// ── 3. 위시리스트 토글 (로그인 필요 — 401 기대값) ──
report.wishlist = await page.evaluate(async () => {
  try {
    const post = await fetch("/api/wishlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "bangeo-hoe" }),
    });
    return { status: post.status, loginRequired: post.status === 401, note: post.status === 401 ? "게스트 위시리스트 미지원(로그인 필요) — 의도된 정책" : "" };
  } catch (e) {
    return { error: String(e).slice(0, 120) };
  }
});

// ── 4. 검색 기능 ──
await page.goto(BASE + "/search?q=%EB%8C%80%EB%B0%A9%EC%96%B4", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);
report.search = await page.evaluate(() => ({
  cards: document.querySelectorAll("a[href^='/product/']").length,
  hasResult: document.body.innerText.includes("대방어"),
}));
await page.screenshot({ path: path.join(OUT_DIR, "search.png") });

// ── 5. 카테고리·베스트 ──
await page.goto(BASE + "/category/beauty", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);
report.category = await page.evaluate(() => ({ cards: document.querySelectorAll("a[href^='/product/']").length, overflow: document.documentElement.scrollWidth - window.innerWidth }));
await page.goto(BASE + "/best", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);
report.best = await page.evaluate(() => ({ cards: document.querySelectorAll("a[href^='/product/']").length }));
await page.screenshot({ path: path.join(OUT_DIR, "category.png") });

// ── 6. 내부 링크 상태 (홈에서 수집, 상위 30개 fetch 검사) ──
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(3000);
report.links = await page.evaluate(async () => {
  const hrefs = [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))];
  const internal = hrefs.filter((h) => h && h.startsWith("/") && !h.startsWith("//"));
  const out = [];
  for (const h of internal.slice(0, 30)) {
    try {
      const r = await fetch(h, { redirect: "follow" });
      if (r.status >= 400) out.push({ href: h, status: r.status });
    } catch (e) {
      out.push({ href: h, status: "ERR" });
    }
  }
  return { totalInternal: internal.length, checked: Math.min(30, internal.length), failures: out };
});

report.consoleErrors = consoleErrors.slice(0, 8);

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(0);

