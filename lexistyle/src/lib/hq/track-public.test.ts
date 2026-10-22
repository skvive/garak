import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPublicTrackView,
  customerCarrier,
  customerText,
  ensureTrackToken,
  maskName,
  trackStage,
  trackTokenOf,
} from "./track-public";
import type { HqState } from "./store";
import type { SourcingOrder } from "./types";

const so = (over: Partial<SourcingOrder> = {}): SourcingOrder =>
  ({ id: 1, purchaseRequestId: 7, supplierId: 1, supplierProductId: 0, costUsd: 1, shippingUsd: 1, status: "confirmed", createdAt: "", ...over }) as SourcingOrder;

const stateWith = (order: SourcingOrder): HqState =>
  ({
    sourcingOrders: [order],
    purchaseRequests: [{ id: 7, productTitle: "LEXI 트렌치코트", buyerName: "고복수", shippingAddress: { name: "고복수" } }],
  }) as unknown as HqState;

test("CJ 추적 상태가 고객 6단계로 매핑된다", () => {
  assert.deepEqual(trackStage("Processing", "confirmed"), { index: 1, warn: false });
  assert.equal(trackStage("Dispatched", "confirmed").index, 2);
  assert.equal(trackStage("Arrived Courier Facility", "shipped").index, 3);
  assert.equal(trackStage("Out for Delivery", "shipped").index, 4);
  assert.deepEqual(trackStage("Unsuccessful Delivery", "shipped"), { index: 4, warn: true });
  assert.equal(trackStage("Delivered", "shipped").index, 5);
  assert.equal(trackStage("", "delivered").index, 5);
});

test("고객 문구는 한국어로 옮기고 CJ 표기와 이름은 노출하지 않는다", () => {
  assert.equal(customerText("Airline departure"), "항공기가 출발했습니다");
  assert.equal(customerText("Arrive at CJ Packet hub"), "Arrive at LEXI hub");
  assert.equal(customerCarrier("CJPacket Eub"), "국제특송");
  assert.equal(customerCarrier(undefined), "배송사 확인 중");
  assert.equal(maskName("고복수"), "고*수");
  assert.equal(maskName("김수"), "김*");
});

test("토큰은 한 번만 발급되고 뷰에는 마스킹된 정보만 담긴다", () => {
  const order = so({ trackingNo: "LP425900258CN", logisticName: "CJPacket Eub" });
  const token = ensureTrackToken(order);
  assert.equal(token.length >= 16, true);
  assert.equal(ensureTrackToken(order), token);
  assert.equal(trackTokenOf(order), token);
  const view = buildPublicTrackView(stateWith(order), token)!;
  assert.equal(view.maskedName, "고*수");
  assert.equal(view.carrier, "국제특송");
  assert.equal(view.stageIndex, 1);
  assert.equal(JSON.stringify(view).includes("고복수"), false);
});

test("없는 토큰·취소·배송완료 90일 경과는 모두 null", () => {
  const order = so({ trackingNo: "LP1" });
  const token = ensureTrackToken(order);
  assert.equal(buildPublicTrackView(stateWith(order), "x".repeat(22)), null);
  assert.equal(buildPublicTrackView(stateWith(order), "short"), null);
  assert.equal(buildPublicTrackView(stateWith({ ...order, status: "cancelled" }), token), null);
  const old = new Date(Date.now() - 91 * 86_400_000).toISOString();
  const expired = so({ trackingNo: "LP1", orderPayload: { publicTrackToken: token, trackSnapshot: { status: "Delivered", routes: [], fetchedAt: old, deliveredAt: old } } });
  assert.equal(buildPublicTrackView(stateWith(expired), token), null);
});
