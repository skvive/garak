import assert from "node:assert/strict";
import { collapseCjCategories, CJ_OTHER, mapCjCategory } from "./cj-categories";

assert.equal(mapCjCategory(["Women's Clothing", "Dresses"]), "여성 의류");
assert.equal(mapCjCategory(["Men's Clothing"]), "남성 의류");
assert.equal(mapCjCategory(["Pet Supplies"]), "애완용품");
assert.equal(mapCjCategory(["Home", "Garden", "Sofa"]), "홈, 가든 & 가구");
assert.equal(mapCjCategory(["Beauty", "Tools"]), "건강, 미용 및 헤어");
assert.equal(mapCjCategory(["Jewelry & Watches"]), "보석 및 시계");
assert.equal(mapCjCategory(["Bags & Shoes", "Sneakers"]), "가방 및 신발");
assert.equal(mapCjCategory(["Toys, Kids & Baby"]), "장난감, 어린이 및 유아용품");
assert.equal(mapCjCategory(["Sports & Outdoor"]), "스포츠 및 아웃도어");
assert.equal(mapCjCategory(["Consumer Electronics"]), "소비자 가전제품");
assert.equal(mapCjCategory(["Home Improvement", "Lighting"]), "주택 개량");
assert.equal(mapCjCategory(["Automobiles & Motorcycles"]), "자동차 및 오토바이");
assert.equal(mapCjCategory(["Phones & Accessories"]), "휴대폰 및 액세서리");
assert.equal(mapCjCategory(["Computer & Office"]), "컴퓨터 및 사무용품");
assert.equal(mapCjCategory(["Fashion", "Accessories"]), "보석 및 시계");
assert.equal(mapCjCategory(["Life", "Gadgets"]), "소비자 가전제품");
assert.equal(mapCjCategory(["여성 의류"]), "여성 의류");
assert.equal(mapCjCategory(["Mystery"]), CJ_OTHER);
assert.equal(mapCjCategory(null), CJ_OTHER);

const collapsed = collapseCjCategories([
  { name: "Women", count: 10 },
  { name: "Dresses", count: 3 },
  { name: "Beauty", count: 2 },
]);
assert.equal(collapsed.find((c) => c.name === "여성 의류")?.count, 13);
assert.equal(collapsed.find((c) => c.name === "건강, 미용 및 헤어")?.count, 2);
assert.ok(collapsed.length <= 15);

console.log("ok");
