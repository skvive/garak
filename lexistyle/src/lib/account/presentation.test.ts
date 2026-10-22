import assert from "node:assert/strict";
import test from "node:test";
import { formatUsd, presentOrderStatus, presentTier, safeShippingAddress } from "./presentation";

test("주문 상태를 고객용 문구와 단계로 변환한다", () => {
  assert.deepEqual(presentOrderStatus("shipped"), { label: "배송 중", tone: "express", step: 3 });
  assert.equal(presentOrderStatus("delivered").label, "배송 완료");
});

test("배송지는 허용 필드만 마스킹하고 통관번호를 버린다", () => {
  const safe = safeShippingAddress({
    name: "강준철",
    address1: "서울특별시 강남구 테헤란로 123",
    city: "서울",
    postal: "06123",
    country: "KR",
    phone: "010-1234-5678",
    customsCode: "P123456789012",
    pccc: "P999999999999",
  });
  assert.deepEqual(Object.keys(safe ?? {}), ["name", "address1", "city", "postal", "country", "phone"]);
  assert.equal(safe?.name, "강**");
  assert.equal(safe?.phone, "***-****-5678");
  assert.equal("customsCode" in (safe ?? {}), false);
});

test("저장된 금액과 등급을 그대로 표시한다", () => {
  assert.match(formatUsd("42.90"), /42\.90/);
  assert.equal(presentTier("gold"), "Gold");
  assert.equal(presentTier("founder"), "founder");
});
