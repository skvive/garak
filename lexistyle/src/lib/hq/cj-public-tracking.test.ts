import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPublicCjTrackingView, isValidCjLookupReference } from "./cj-public-tracking";

test("CJ 주문번호·운송장 형식만 허용한다", () => {
  assert.equal(isValidCjLookupReference("2610010721310640200"), true);
  assert.equal(isValidCjLookupReference("LP425900258CN"), true);
  assert.equal(isValidCjLookupReference("SD2610010721290646500"), true);
  assert.equal(isValidCjLookupReference("123"), false);
  assert.equal(isValidCjLookupReference("abc/../../secret"), false);
  assert.equal(isValidCjLookupReference("a".repeat(65)), false);
});

test("공개 뷰에는 배송 상태와 정제된 이동 기록만 담긴다", () => {
  const view = buildPublicCjTrackingView({
    reference: "2610010721310640200",
    lookupKind: "order",
    trackingNo: "LP425900258CN",
    carrier: "CJPacket Eub",
    orderStatus: "SHIPPED",
    tracking: {
      status: "Out for Delivery",
      routes: [{ time: "2026-10-20 09:00", place: "Seoul", text: "Arrive at CJ Packet hub" }],
    },
    now: new Date("2026-10-21T00:00:00.000Z"),
  });
  assert.equal(view.carrier, "국제특송");
  assert.equal(view.orderStatus, "배송 중");
  assert.equal(view.stageIndex, 4);
  assert.equal(view.routes[0]?.text, "Arrive at LEXI hub");
  assert.equal(JSON.stringify(view).includes("address"), false);
});
