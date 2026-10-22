/**
 * 특정 Neon URL에서 products 상품명 존재 확인 + 총 개수
 * npx tsx scripts/find-prod-db.ts <DATABASE_URL>
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const target = process.argv[2] || "";
process.env.DATABASE_URL = target;

import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("조회 DB:", new URL(target).host);
  const d = db();
  const [cnt] = await d.execute(sql`select count(*)::int as n, count(*) filter (where deleted_at is null and is_dummy=false)::int as live from products`);
  console.log("products total:", cnt?.n ?? "?", "| live:", cnt?.live ?? "?");

  // /best에 보였던 상품명들로 검색 (프로덕션 DB 특정용)
  const probes = [
    "Plush Pajama Pants",
    "Banana-shaped One-piece",
    "Pirate Skull Ring",
    "Computer Keyboard Cleaning Clay",
    "Duvet Cover And Sheet",
    "Pumpkin Multi-tier Cake Stand",
  ];
  for (const p of probes) {
    const [r] = await d.execute(sql`select count(*)::int as n from products where name ilike ${`%${p}%`}`);
    console.log(`  "${p}": ${r?.n ?? 0}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});