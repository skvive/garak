import assert from "node:assert/strict";
import { test } from "node:test";
import { officialCoupangCarrier, resolveCoupangDeliveryCode } from "./carrier-map";

test("CJPacket variants are sent as DIRECT (no Coupang tracking link), overriding order-sheet and fallback codes", () => {
  assert.equal(officialCoupangCarrier("CJPacket"), "DIRECT");
  assert.equal(officialCoupangCarrier("CJPacket Eub"), "DIRECT");
  assert.equal(officialCoupangCarrier("CJ Packet Ordinary"), "DIRECT");
  assert.equal(
    resolveCoupangDeliveryCode({ carrier: "CJPacket", orderCode: "HANJIN", fallback: "CJGLS" }),
    "DIRECT",
  );
});

test("other CJ international names are still not sent as Coupang carrier codes", () => {
  assert.equal(officialCoupangCarrier("YunExpress"), null);
  assert.equal(resolveCoupangDeliveryCode({ carrier: "YunExpress", fallback: "EPOST" }), "EPOST");
});

test("known carriers and already-official codes pass through", () => {
  assert.equal(resolveCoupangDeliveryCode({ carrier: "DHL", fallback: "HANJIN" }), "DHL");
  assert.equal(resolveCoupangDeliveryCode({ carrier: "cjgls" }), "CJGLS");
  assert.equal(resolveCoupangDeliveryCode({ carrier: "우체국택배" }), "EPOST");
});
