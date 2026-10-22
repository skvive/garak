import assert from "node:assert/strict";
import { test } from "node:test";
import { allowLookupAttempt, findTrackMatches } from "./track-lookup";
import type { HqState } from "./store";

const state = {
  purchaseRequests: [
    { id: 1, externalOrderRef: "3103601680449:96155574163", productTitle: "트렌치코트 XS", shippingAddress: { name: "고 복수" } },
    { id: 2, externalOrderRef: "3103601680449:96155574164", productTitle: "트렌치코트 XXL", shippingAddress: { name: "고복수" } },
    { id: 3, externalOrderRef: "3103601680449:96155574165", productTitle: "토큰 없음", shippingAddress: { name: "고복수" } },
    { id: 4, externalOrderRef: "9999999999999", productTitle: "남의 주문", shippingAddress: { name: "김철수" } },
  ],
  sourcingOrders: [
    { id: 1, purchaseRequestId: 1, orderPayload: { publicTrackToken: "A".repeat(22) } },
    { id: 2, purchaseRequestId: 2, orderPayload: { publicTrackToken: "B".repeat(22) } },
    { id: 4, purchaseRequestId: 4, orderPayload: { publicTrackToken: "C".repeat(22) } },
  ],
} as unknown as HqState;

test("주문번호+성함이 모두 맞는 발주만, 공백 무시, 토큰 없는 건 제외", () => {
  const hits = findTrackMatches(state, " 3103601680449 ", "고복수");
  assert.deepEqual(hits.map((h) => h.token), ["A".repeat(22), "B".repeat(22)]);
  assert.deepEqual(findTrackMatches(state, "3103601680449", "김철수"), []);
  assert.deepEqual(findTrackMatches(state, "9999999999999", "고복수"), []);
  assert.deepEqual(findTrackMatches(state, "12", "고복수"), []);
  assert.deepEqual(findTrackMatches(state, "9999999999999", "김"), []);
});

test("시도 제한: 9번째부터 막히고 창이 지나면 풀린다", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 8; i++) assert.equal(allowLookupAttempt("ip-x", t0 + i), true);
  assert.equal(allowLookupAttempt("ip-x", t0 + 9), false);
  assert.equal(allowLookupAttempt("ip-y", t0 + 9), true);
  assert.equal(allowLookupAttempt("ip-x", t0 + 10 * 60_000 + 100), true);
});
