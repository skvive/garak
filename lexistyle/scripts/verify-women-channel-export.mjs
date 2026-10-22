/**
 * 실검증: Vercel 서버 API로 여성패션 10건 PDP + 쿠팡·Shopee·Amazon 익스포트
 *
 *   node scripts/verify-women-channel-export.mjs
 *   COUNT=10 BASE=https://lexistyle.vercel.app node scripts/verify-women-channel-export.mjs
 */
import fs from "fs";

const BASE = process.env.BASE || "https://lexistyle.vercel.app";
const COUNT = Math.min(Number(process.env.COUNT || 10), 15);
const LOG = "scripts/verify-women-channel-export.log";

function log(line) {
  console.log(line);
  fs.appendFileSync(LOG, `${line}\n`);
}

async function demoCookie() {
  const res = await fetch(`${BASE}/api/auth/demo?next=/hq`, { method: "POST", redirect: "manual" });
  const raw = res.headers.getSetCookie?.() ?? [];
  const fromList = raw.find((c) => c.startsWith("lexi_demo="));
  if (fromList) return fromList.split(";")[0];
  const sc = res.headers.get("set-cookie") || "";
  const m = sc.match(/lexi_demo=([^;]+)/);
  if (!m) throw new Error(`demo login failed: ${res.status}`);
  return `lexi_demo=${m[1]}`;
}

async function hq(cookie, path, method = "GET", body) {
  const res = await fetch(`${BASE}/api/hq${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status} ${path}`);
  return json;
}

async function main() {
  fs.writeFileSync(LOG, `# verify ${new Date().toISOString()}\n`);
  log(`BASE=${BASE} COUNT=${COUNT}`);

  const cookie = await demoCookie();
  log("demo cookie ok");

  log("POST /verify/women-channel-export (may take 2–5 min)…");
  const report = await hq(cookie, "/verify/women-channel-export", "POST", { count: COUNT });

  log("\n=== REPORT ===");
  log(JSON.stringify(report, null, 2));
  fs.writeFileSync("scripts/verify-women-channel-export.report.json", JSON.stringify(report, null, 2));

  console.log("\nReport: scripts/verify-women-channel-export.report.json");
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  fs.appendFileSync(LOG, `FATAL ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
