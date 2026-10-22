// scripts/test-map-category.mts
// 새 leaf가 men 버킷으로 매핑되는지 검증
import { bucketForCjChip, mapCategorySlug } from "../src/lib/catalog/lexi-cj-categories";

const leaves = ["Men's Hats & Caps", "Men's Socks", "Woman Hats & Caps", "Woman Socks"];
for (const leaf of leaves) {
  const bucket = bucketForCjChip(leaf);
  const slug = mapCategorySlug([leaf]);
  console.log(`${leaf.padEnd(25)} → bucket=${bucket?.key ?? "(none)"} slug=${slug}`);
}
