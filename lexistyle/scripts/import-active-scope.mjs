/**
 * 취급 7버킷(여성·액세서리·남성·아우터·가방·슈즈·메이크업) none → Import 루프
 * Production API + 데모 쿠키 사용 (서버에 CJ 키 있음).
 *
 *   node scripts/import-active-scope.mjs
 *   LIMIT=200 BATCH=8 SLEEP_MS=2500 BASE=https://lexistyle.vercel.app node scripts/import-active-scope.mjs
 */
import fs from "fs";

const BASE = process.env.BASE || "https://lexistyle.vercel.app";
const LIMIT = Number(process.env.LIMIT || 0); // 0 = until empty
const BATCH = Math.min(Number(process.env.BATCH || 8), 20);
const SLEEP_MS = Number(process.env.SLEEP_MS || 2500);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function demoCookie() {
  const res = await fetch(`${BASE}/api/auth/demo?next=/hq`, {
    method: "POST",
    redirect: "manual",
  });
  const raw = res.headers.getSetCookie?.() ?? [];
  const fromList = raw.find((c) => c.startsWith("lexi_demo="));
  if (fromList) return fromList.split(";")[0];
  const sc = res.headers.get("set-cookie") || "";
  const m = sc.match(/lexi_demo=([^;]+)/);
  if (!m) throw new Error(`demo login failed: ${res.status}`);
  return `lexi_demo=${m[1]}`;
}

async function importBatch(cookie, limit) {
  const res = await fetch(`${BASE}/api/hq/catalog/import-scope`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ limit }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function main() {
  console.log("base", BASE, "batch", BATCH, "limit", LIMIT || "∞");
  const cookie = await demoCookie();
  console.log("demo cookie ok");

  let totalOk = 0;
  let totalFail = 0;
  let rounds = 0;
  const logPath = "scripts/import-active-scope.log";

  while (true) {
    if (LIMIT > 0 && totalOk + totalFail >= LIMIT) break;
    rounds++;
    const rem = LIMIT > 0 ? Math.min(BATCH, LIMIT - totalOk - totalFail) : BATCH;
    let json;
    try {
      json = await importBatch(cookie, rem);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("fail", msg);
      fs.appendFileSync(logPath, `${new Date().toISOString()} ERR ${msg}\n`);
      await sleep(SLEEP_MS * 2);
      continue;
    }
    const imported = json.imported ?? 0;
    const failed = json.failed ?? 0;
    totalOk += imported;
    totalFail += failed;
    const line = `${new Date().toISOString()} round=${rounds} +ok=${imported} +fail=${failed} totalOk=${totalOk} totalFail=${totalFail} ids=${(json.catalogIds || []).join(",")}`;
    console.log(line);
    fs.appendFileSync(logPath, `${line}\n`);
    if (!json.requested) {
      console.log("queue empty — done");
      break;
    }
    await sleep(SLEEP_MS);
  }

  console.log("DONE", { totalOk, totalFail, rounds });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
