/**
 * catalog_index DB에서 판매량(listedNum) 기준 베스트 상품을 LEXI 카테고리별로 선별
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { db } from "@/db";
import { catalogIndex } from "@/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// LEXI 카테고리 → CJ leaf 매핑
const LEXI_CATEGORIES: Record<string, string[]> = {
  "women-clothing": ["Lady Dresses", "Blouses & Shirts", "Skirts", "Wide Leg Pants", "Rompers", "Women's Long-Sleeved Shirts", "Women's Short-Sleeved Shirts", "Women's Tube Tops", "Leggings", "Woman Hoodies & Sweatshirts", "Sweaters"],
  "men-clothing": ["Suits & Sets", "Blazers", "Men's Sweaters", "Man Hoodies & Sweatshirts", "Men's Shirts", "Men's Jackets", "Man Shorts"],
  "bags-shoes": ["Totes", "Flats", "Pumps", "Woman Boots", "Fashion Backpacks", "Crossbody Bags", "Woman Sandals", "Casual Shoes", "Woman Slippers"],
  "beauty": ["Body Care", "Face Skin Care Tools", "Facial Care", "Lipstick", "Makeup Set", "Nail Art Kits"],
  "jewelry": ["Necklace & Pendants", "Earrings", "Rings", "Bracelets & Bangles", "925 Silver Jewelry", "Fashion Jewelry Sets", "Fine Earrings"],
  "home-garden": ["Furniture", "Home Office Storage", "Kitchen Storage", "Pillows", "Bedding Sets", "Bathroom Storage", "Storage Bags & Cases & Boxes", "Comforters"],
  "electronics": ["Power Tools", "Night Lights", "Power Bank", "Speakers", "Earphones & Headphones", "Smart Watches"],
  "sports": ["Fitness & Bodybuilding", "Swimming Goggles", "Camping & Hiking", "Sports Accessories", "Cycling Eyewear", "Cycling Gloves"],
  "kids": ["Girl Clothing Sets", "Boys Bags", "Girl Dresses", "Boy Clothing Sets", "Baby Clothing Sets", "Baby Rompers"],
  "pet": ["Pet Shower Products", "Pet Furniture Tools", "Pet Beds", "Pet Feeding Tools", "Pet Nests", "Pet Bowls"],
  "auto": ["Exterior Parts", "Interior Parts", "Car Brake System", "Vehicle Camera"],
  "phones": ["Silicone Cases", "Waterptoof Cases", "Charger", "Cables", "Memory Cards"],
  "computers": ["Computer Tablet Accessories", "Tablet Accessories"],
  "home-improve": ["Other Replacement Parts", "Home Appliance Parts", "Other Maintenance Products"],
};

async function main() {
  const database = db();
  console.log("🏆 catalog_index DB에서 베스트 상품 선별...\n");

  // 전체 상품 수 확인
  const [total] = await database
    .select({ count: sql<number>`count(*)` })
    .from(catalogIndex)
    .where(eq(catalogIndex.supplierCode, "cjdropshipping"));
  console.log(`📊 전체 CJ 상품: ${total.count}개\n`);

  const lines: string[] = [];
  lines.push("# LEXI 베스트 상품 (CJ 판매량 기준)");
  lines.push("");
  lines.push(`**생성일**: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
  lines.push(`**DB 총 상품 수**: ${total.count}개`);
  lines.push(`**판매량(listedNum) 기준 정렬**`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // 목차
  lines.push("## 목차");
  lines.push("");
  for (const [lexiCat] of Object.entries(LEXI_CATEGORIES)) {
    lines.push(`- [${lexiCat}](#${lexiCat.replace(/\s+/g, "-")})`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const [lexiCat, cjLeaves] of Object.entries(LEXI_CATEGORIES)) {
    console.log(`📦 ${lexiCat} 처리 중...`);

    // 해당 CJ leaf들의 상품을 listedNum 기준으로 정렬
    const products = await database
      .select()
      .from(catalogIndex)
      .where(
        and(
          eq(catalogIndex.supplierCode, "cjdropshipping"),
          inArray(sql`${catalogIndex.categoryPath}[1]`, cjLeaves),
          sql`"raw_meta"->>'listedNum' IS NOT NULL`
        )
      )
      .orderBy(desc(sql`CAST("raw_meta"->>'listedNum' AS INTEGER)`))
      .limit(20);

    lines.push(`## ${lexiCat} (${products.length}개)`);
    lines.push("");
    lines.push("| # | 상품명 | 가격(USD) | 판매량 | 카테고리 |");
    lines.push("|---|--------|----------|--------|----------|");

    products.forEach((p, idx) => {
      const listedNum = (p.rawMeta as any)?.listedNum || 0;
      const price = p.minPrice ? `$${Number(p.minPrice).toFixed(2)}` : "-";
      const title = p.title.length > 50 ? p.title.slice(0, 47) + "..." : p.title;
      const cat = p.categoryPath?.[0] || "-";
      lines.push(`| ${idx + 1} | ${title} | ${price} | ${listedNum.toLocaleString()} | ${cat} |`);
    });

    lines.push("");
    console.log(`  ✓ ${products.length}개 상품`);
  }

  // 저장
  const outputPath = path.join(process.cwd(), "docs", "lexi-best-products.md");
  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
  console.log(`\n📄 생성 완료: ${outputPath}`);
}

main().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
