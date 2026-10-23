// 가락한상 인증(데모 세션)·주문·결제 E2E 검증
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 9333;
const CDP = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.TEMP || "/tmp", "garak-shot-profile");
const BASE = "http://localhost:3000/ko";
const OUT_DIR = "E:/currsor_C/lawsign/garak-hansang/docs/screenshots/auth";

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

// ── 1. 회원가입 페이지 렌더 (브랜딩 확인) ──
await page.goto(BASE + "/auth/sign-up", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
report.signupPage = await page.evaluate(() => ({
  title: document.body.innerText.includes("회원가입"),
  branded: document.body.innerText.includes("가락한상"),
  googleBtn: document.body.innerText.includes("Google"),
}));
await page.screenshot({ path: path.join(OUT_DIR, "signup.png") });

// ── 2. 게스트 상태 확인 ──
await page.goto(BASE + "/account", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
report.guestState = await page.evaluate(() => ({
  loginPrompt: document.body.innerText.includes("로그인") || document.body.innerText.includes("가입"),
}));
await page.screenshot({ path: path.join(OUT_DIR, "account-guest.png") });

// ── 3. 데모 로그인 → 세션 발급 ──
await page.evaluate(async () => {
  await fetch("/ko/api/auth/demo?next=/ko/account", { method: "POST", redirect: "manual" });
});
await page.waitForTimeout(2000);
await page.goto(BASE + "/account", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
report.loggedIn = await page.evaluate(() => ({
  hasDemoUser: document.body.innerText.includes("demo@lexi.local") || document.body.innerText.includes("Demo Admin"),
}));
await page.screenshot({ path: path.join(OUT_DIR, "account-loggedin.png") });

// ── 4. 세션 기반 위시리스트 ──
report.wishlist = await page.evaluate(async () => {
  const post = await fetch("/ko/api/wishlist", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "bangeo-hoe" }),
  });
  const get = await fetch("/ko/api/wishlist");
  const d = await get.json();
  return { postStatus: post.status, contains: (d.slugs ?? []).includes("bangeo-hoe"), count: (d.slugs ?? []).length };
});

// ── 5. 장바구니 담기 ──
report.cart = await page.evaluate(async () => {
  const post = await fetch("/ko/api/cart", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "bangeo-hoe", qty: 1 }),
  });
  const get = await fetch("/ko/api/cart");
  const d = await get.json();
  return { postStatus: post.status, items: (d.items ?? []).length, subtotal: d.subtotal };
});

// ── 6. 주문 + 결제(mock PG) ──
report.checkout = await page.evaluate(async () => {
  const res = await fetch("/ko/api/checkout", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo@lexi.local",
      name: "데모 고객",
      address1: "서울특별시 송파구 새말로 15길 16-8",
      address2: "101호",
      city: "서울",
      zip: "05600",
      country: "KR",
      provider: "mock",
    }),
  });
  const d = await res.json();
  return { status: res.status, ...d };
});

// ── 7. 결제 성공 페이지 ──
if (report.checkout.redirectUrl) {
  await page.goto(report.checkout.redirectUrl.replace("http://localhost:3000", BASE), { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);
  report.successPage = await page.evaluate(() => ({
    paid: document.body.innerText.includes("결제 완료") || document.body.innerText.includes("주문이 완료") || document.body.innerText.includes("성공"),
    text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 120),
  }));
  await page.screenshot({ path: path.join(OUT_DIR, "payment-success.png") });
}

// ── 8. 주문 내역 페이지 ──
await page.goto(BASE + "/account/orders", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
report.ordersPage = await page.evaluate(() => ({
  ok: document.body.innerText.length > 100,
  text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 120),
}));
await page.screenshot({ path: path.join(OUT_DIR, "orders.png") });

report.consoleErrors = consoleErrors.slice(0, 6);
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(0);
