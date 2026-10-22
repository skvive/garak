import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSupplyOption } from "./option-match";
import { pickCjVariantId } from "@/lib/sourcing/connectors/cjdropshipping";

const coat = [
  { sku: "2609210703401634100", name: "Black M" },
  { sku: "2609210703401634103", name: "Black 2XL" },
  { sku: "2609210703401634108", name: "Apricot 2XL" },
];

test("쿠팡 아이템 SKU(=CJ vid)로 사이즈 variant를 고른다 — 한글 옵션명이어도", () => {
  assert.equal(pickSupplyOption(coat, "베이지 2XL", "2609210703401634108")?.name, "Apricot 2XL");
  assert.equal(pickSupplyOption(coat, "Black 2XL")?.sku, "2609210703401634103");
});

test("다옵션인데 SKU·옵션명이 안 맞으면 첫 옵션으로 오발주하지 않는다", () => {
  assert.equal(pickSupplyOption(coat, "블랙 2XL"), undefined);
  assert.equal(pickSupplyOption(coat, undefined, "UNKNOWN"), undefined);
  assert.equal(pickSupplyOption([coat[0]!], "블랙 M")?.sku, "2609210703401634100");
});

test("CJ 발주 vid — 채널 SKU 우선, 옵션명 불일치 다옵션은 undefined", () => {
  const variants = coat.map((o) => ({ vid: o.sku, variantNameEn: `Men's Coat ${o.name}` }));
  assert.equal(pickCjVariantId(variants, "베이지 2XL", undefined, "2609210703401634108"), "2609210703401634108");
  assert.equal(pickCjVariantId(variants, "블랙 2XL"), undefined);
  assert.equal(pickCjVariantId(variants, "black 2xl"), "2609210703401634103");
});
