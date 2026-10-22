import test from "node:test";
import assert from "node:assert/strict";
import { cjOptionsToListingOptions, mapCjVariantsToOptions, parseVariantAttributes } from "./cj-options";

test("parses common CJ color and size separators", () => {
  assert.deepEqual(parseVariantAttributes("Black / XL"), { variant: "Black / XL", color: "Black", size: "XL" });
  assert.equal(parseVariantAttributes("Camel,2XL").size, "2XL");
  assert.equal(parseVariantAttributes("Navy_M").color, "Navy");
});

test("preserves explicit CJ size and color fields for Coupang options", () => {
  const shelf = mapCjVariantsToOptions([{
    vid: "CJQB156210006FU-BLK-L",
    variantNameEn: "Product common words Black L",
    variantColor: "Black",
    variantSize: "L",
    inventory: 7,
    variantSellPrice: 12,
  }], 12);
  const [option] = cjOptionsToListingOptions(shelf, 12);
  assert.equal(option?.sku, "CJQB156210006FU-BLK-L");
  assert.equal(option?.attributes?.color, "Black");
  assert.equal(option?.attributes?.size, "L");
  assert.equal(option?.stock, 7);
});
