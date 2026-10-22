import test from "node:test";
import assert from "node:assert/strict";
import { storeOptionsFromRawMeta } from "./storefront-options";

test("maps cached CJ color and size variants without a network call", () => {
  const options = storeOptionsFromRawMeta({
    variants: [
      { vid: "v-black-m", variantColor: "Black", variantSize: "M" },
      { vid: "v-beige-l", variantColor: "Beige", variantSize: "L" },
    ],
  });
  assert.deepEqual(options, [
    { sku: "v-black-m", label: "블랙 / M", dims: ["블랙", "M"] },
    { sku: "v-beige-l", label: "베이지 / L", dims: ["베이지", "L"] },
  ]);
});

test("does not expose incomplete or single-option caches", () => {
  assert.deepEqual(storeOptionsFromRawMeta(null), []);
  assert.deepEqual(storeOptionsFromRawMeta({ variants: [{ vid: "only", variantName: "Black-M" }] }), []);
});

test("uses variantKey when CJ returns an empty localized name", () => {
  const options = storeOptionsFromRawMeta({
    variants: [
      { vid: "white-m", variantNameEn: "", variantName: null, variantKey: "White-M" },
      { vid: "black-l", variantNameEn: "", variantName: null, variantKey: "Black-L" },
    ],
  });
  assert.deepEqual(options.map((option) => option.dims), [["화이트", "M"], ["블랙", "L"]]);
});
