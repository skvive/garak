import assert from "node:assert/strict";
import { test } from "node:test";
import { coupangLookbackRange, coupangOrderLookbackDays } from "./client";

test("ordersheet lookback is one KST range request, capped at 31 days", () => {
  const now = new Date("2026-10-02T15:00:00.000Z");
  assert.deepEqual(coupangLookbackRange(7, now), { from: "2026-09-27", to: "2026-10-03" });
  assert.equal(coupangLookbackRange(1, now).from, "2026-10-03");
  assert.equal(coupangLookbackRange(90, now).from, "2026-09-03");
});

test("automatic order pulls default to 31 days and clamp configuration", () => {
  assert.equal(coupangOrderLookbackDays(undefined), 31);
  assert.equal(coupangOrderLookbackDays("14"), 14);
  assert.equal(coupangOrderLookbackDays("0"), 1);
  assert.equal(coupangOrderLookbackDays("90"), 31);
  assert.equal(coupangOrderLookbackDays("invalid"), 31);
});
