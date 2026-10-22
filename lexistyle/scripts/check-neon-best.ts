/**
 * 특정 Neon URL의 products 상태 확인
 * npx tsx scripts/check-neon-best.ts <DATABASE_URL>
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const target = process.argv[2] || process.env.NEON_DATABASE_URL || "";
process.env.DATABASE_URL = target;

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { products, productImages } from "../src/db/schema";

async function main() {
  console.log("조회 DB:", new URL(target).host);
  const d = db();
  const all = await d.select().from(products).orderBy(products.id);
  console.log("products total(전체):", all.length);
  const live = all.filter((p) => p.isDummy === false && !p.deletedAt);
  const deleted = all.filter((p) => p.deletedAt);
  console.log("live:", live.length, "| deleted:", deleted.length);
  console.log("\n우리 8개 확인 (title match):");
  const ours = live.filter(
    (p) =>
      /Retro Leopard|숏 A라인|Versatile Chic|Waist-cinching|Womens Dress|Girls Blue Strappy|Turn-down Collar|Loose Solid Color/i.test(p.name),
  );
  if (ours.length === 0) console.log("  (없음)");
  for (const p of ours) {
    const imgs = await d
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, p.id))
      .orderBy(productImages.sort);
    console.log(`  #${p.id} | ${p.name.slice(0, 40)} | $${p.priceUsd} | imgs=${imgs.length} | rc=${p.reviewCount}`);
  }

  console.log("\nlive 트렁크 (상위 8 by id):");
  for (const p of live.slice(0, 8)) {
    const imgs = await d
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, p.id))
      .orderBy(productImages.sort);
    console.log(`  #${p.id} | ${p.name.slice(0, 42)} | $${p.priceUsd} | imgs=${imgs.length} | rc=${p.reviewCount}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});