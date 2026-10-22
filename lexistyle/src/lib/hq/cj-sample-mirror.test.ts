import assert from "node:assert/strict";
import { test } from "node:test";
import { needsCjSampleMirror } from "./cj-sample-mirror";

const base = {
  supplierId: 1,
  expectedSupplierId: 1,
  channelId: 2,
  expectedChannelId: 2,
  sourcingCreatedAt: "2026-10-21T09:00:00.000Z",
  startAt: Date.parse("2026-10-21T00:00:00.000Z"),
};

test("시작시각 이후 쿠팡 CJ 원발주 중 미러가 없는 건만 선택한다", () => {
  assert.equal(needsCjSampleMirror(base), true);
  assert.equal(needsCjSampleMirror({ ...base, existingRef: "CJ-SAMPLE-1" }), false);
  assert.equal(needsCjSampleMirror({ ...base, channelId: 3 }), false);
  assert.equal(needsCjSampleMirror({ ...base, supplierId: 9 }), false);
  assert.equal(needsCjSampleMirror({ ...base, sourcingCreatedAt: "2026-10-20T23:59:59.000Z" }), false);
});
