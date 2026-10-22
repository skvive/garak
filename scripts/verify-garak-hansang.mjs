// 가락한상 디자인 인터페이스 검증 스크립트 (검증용 임시 도구)
// 렌더링된 DOM·계산된 스타일·콘솔 오류를 점검해 보고서를 출력한다.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 9333;
const CDP = `http://127.0.0.1:${PORT}`;
const PROFILE = path.join(process.env.TEMP || "/tmp", "garak-shot-profile");
const URL = "http://localhost:3000/ko";

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

let launched = false;
if (!(await cdpUp())) {
  launched = true;
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

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
});
page.on("pageerror", (err) => consoleErrors.push(String(err).slice(0, 200)));

await page.setViewportSize({ width: 430, height: 932 });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(7000);

const report = await page.evaluate(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const style = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : "MISSING");
  const vis = (el) => !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;

  return {
    title: document.title,
    h1: $("h1.sr-only")?.textContent?.trim().slice(0, 60) ?? null,
    // 헤더
    headerLogo: $("header a[href='/']")?.textContent?.trim(),
    gnbLabels: $$("header nav a").map((a) => a.textContent?.trim()),
    // 티커
    tickerVisible: vis($(".ocean-band")),
    tickerLabel: $(".ocean-band span.bg-\\[\\#0a4468\\]")?.textContent?.trim(),
    tickerItems: $$(".ocean-band a").length,
    tickerAnimating: style($(".animate-ticker"), "animation-name"),
    // 카운트다운
    countdownText: $("section[aria-label='당일배송 마감 안내']")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 90),
    countdownHHMMSS: /[0-9]{2}:[0-9]{2}:[0-9]{2}/.test($("section[aria-label='당일배송 마감 안내']")?.textContent ?? ""),
    // 히어로
    heroHeadline: $("section[aria-label='에디토리얼 하이라이트']")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 80),
    heroOverlayOcean: style($(".ocean-hero-overlay"), "background-image").includes("linear-gradient"),
    // 카드 뱃지
    badgePriceDown: $$(".badge-price-down").length,
    badgeAuction: $$(".badge-auction").length,
    badgeGradeA: $$(".badge-grade-a").length,
    badgeSeason: $$("span").filter((s) => s.textContent?.includes("제철 NOW")).length,
    originLines: $$("p").filter((p) => p.textContent?.includes("원산지")).length,
    socialProof: $$("p").filter((p) => p.textContent?.includes("이번 주") && p.textContent?.includes("구매")).length,
    // 카테고리 칩 / 탭바
    chips: $$("section[aria-label='카테고리 바로가기'] a span.text-\\[12px\\]").map((s) => s.textContent),
    bottomTabs: $$("nav[aria-label='하단 탭'] span.text-\\[10px\\]").map((s) => s.textContent),
    // 상품 카드 수 (랭킹 섹션)
    rankingCards: $$("a[href^='/product/']").length,
    // 신규 섹션 (5대 벤치마크 반영)
    processStrip: $$("section[aria-label='가락한상 신선 프로세스'] p.text-\\[12px\\]").map((s) => s.textContent),
    promoCount: $$("section[aria-label='기획전'] a").length,
    promoTitles: $$("section[aria-label='기획전'] p.text-\\[14px\\]").map((s) => s.textContent),
    seasonKickers: $$("section[aria-label='제철 추천'] p.text-\\[11px\\]").map((s) => s.textContent),
    deliveryBadges: $$("span").filter((s) => /당일·새벽|택배 익일/.test(s.textContent ?? "")).length,
    soldoutCount: $$("span").filter((s) => s.textContent?.includes("SOLDOUT")).length,
    sizeLines: $$("p").filter((p) => p.textContent?.startsWith("크기 ·")).length,
    // 콘솔 오류 수는 밖에서 집계
  };
});

console.log("=== 가락한상 인터페이스 검증 보고서 (모바일 430px) ===");
console.log(JSON.stringify(report, null, 2));
console.log("consoleErrors:", JSON.stringify(consoleErrors.slice(0, 5)));
console.log("screenshot files:", fs.readdirSync("E:/currsor_C/lawsign/garak-hansang/docs/screenshots")
  .map((f) => `${f}:${fs.statSync(path.join("E:/currsor_C/lawsign/garak-hansang/docs/screenshots", f)).size}bytes`)
  .join(", "));

await browser.close();
process.exit(0);
