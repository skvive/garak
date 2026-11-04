#!/usr/bin/env node
// Read-only production smoke checks. Never captures card data or creates orders.
// Usage: BASE_URL=https://garak.lexid.site node scripts/qa-garak-commerce.mjs
import assert from "node:assert/strict";

const base = (process.env.BASE_URL ?? "https://garak.lexid.site").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) throw new Error("BASE_URL must be https");
const checks = [
  ["/", ["검수 완료 입점 상품", "입점 상품을 확인하고 있습니다"]],
  ["/ko/prices", ["실시간 시세는 아직 제공되지 않습니다", "시세 데이터 검증 중"]],
  ["/ko/reservation", ["예약 시스템 연동 전", "온라인 예약 신청은 열지 않았습니다"]],
  ["/ko/subscription", ["구독 상품 준비 중", "현재 온라인 신청 및 결제는 진행되지 않습니다"]],
  ["/ko/support", ["고객·입점 안내", "광양수산 상품"]],
  ["/ko/checkout", ["주문·결제 준비 중", "온라인 신규 주문과 결제는 접수하지 않으며"]],
];
async function get(path, init) {
  const res = await fetch(new URL(path, base), {
    ...init,
    headers: { Accept: "text/html", ...(init?.headers ?? {}) },
    redirect: "follow",
    signal: AbortSignal.timeout(18000),
  });
  const body = await res.text();
  return { status: res.status, body, url: res.url };
}
const failures = [];
for (const [path, expected] of checks) {
  try {
    const res = await get(path);
    assert.equal(res.status, 200, `${path} must return HTTP 200`);
    for (const text of expected) assert.ok(res.body.includes(text), `${path}: missing ${text}`);
    console.log("PASS", path, res.status);
  } catch (e) {
    failures.push(`${path}: ${e.message}`);
    console.error("FAIL", path, e.message);
  }
}
try {
  const health = await get("/api/health/commerce", { headers: { Accept: "application/json" } });
  assert.equal(health.status, 200);
  const v = JSON.parse(health.body);
  assert.equal(v.database, "reachable");
  assert.equal(v.checkoutEnabled, false);
  assert.equal(v.inventoryState, "imported-and-gated");
  console.log("PASS", "/api/health/commerce", health.status);
} catch (e) {
  failures.push(`health: ${e.message}`);
  console.error("FAIL health", e.message);
}
try {
  const result = await get("/api/checkout", { headers: { Accept: "application/json" } });
  assert.equal(result.status, 200);
  const state = JSON.parse(result.body);
  assert.equal(state.checkoutEnabled, false);
  assert.deepEqual(state.providers, []);
  // Only probe an empty POST after confirmation that checkout is disabled;
  // it must be rejected before creating any new order in the database.
  const blocked = await get("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
  assert.equal(blocked.status, 503);
  assert.ok(JSON.parse(blocked.body).error);
  console.log("PASS", "/api/checkout GET+POST fail-closed");
} catch (e) {
  failures.push(`checkout: ${e.message}`);
  console.error("FAIL checkout", e.message);
}
if (failures.length) {
  console.error(`Garak commerce smoke: ${failures.length} failure(s):\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Garak commerce smoke passed: no orders created, no payment captured.");
}
