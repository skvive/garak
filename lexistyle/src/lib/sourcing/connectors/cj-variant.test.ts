import assert from "node:assert/strict";
import { test } from "node:test";
import { pickCjVariantId } from "./cjdropshipping";

test("CJ order uses variant id, not the product id", () => {
  const variants = [
    { vid: "V-BLACK", variantNameEn: "Black / M" },
    { vid: "V-RED", variantNameEn: "Red / M" },
  ];
  assert.equal(pickCjVariantId(variants, "Red / M", "PID-1"), "V-RED");
  assert.equal(pickCjVariantId(variants, undefined, "V-BLACK"), "V-BLACK");
  assert.equal(pickCjVariantId(variants), "V-BLACK");
});
