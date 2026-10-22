import test from "node:test";
import assert from "node:assert/strict";
import { coupangDeliveryCharge, coupangReturnShippingFee } from "./constants";

test("LEXI Coupang overseas shipping policy defaults to 24,000 won each way", () => {
  const oldDelivery = process.env.COUPANG_DELIVERY_CHARGE;
  const oldReturn = process.env.COUPANG_RETURN_SHIPPING_FEE;
  delete process.env.COUPANG_DELIVERY_CHARGE;
  delete process.env.COUPANG_RETURN_SHIPPING_FEE;
  try {
    assert.equal(coupangDeliveryCharge(), 24000);
    assert.equal(coupangReturnShippingFee(), 24000);
    assert.equal(coupangDeliveryCharge() + coupangReturnShippingFee(), 48000);
  } finally {
    if (oldDelivery === undefined) delete process.env.COUPANG_DELIVERY_CHARGE;
    else process.env.COUPANG_DELIVERY_CHARGE = oldDelivery;
    if (oldReturn === undefined) delete process.env.COUPANG_RETURN_SHIPPING_FEE;
    else process.env.COUPANG_RETURN_SHIPPING_FEE = oldReturn;
  }
});
