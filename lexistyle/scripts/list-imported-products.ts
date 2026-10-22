/**
 * 소싱상품을 카테고리별로 정리한 MD 문서 생성
 * DB가 비어있으면 더미 데이터 사용
 * Usage: npx tsx scripts/list-imported-products.ts
 */
import { db, hasDb } from "@/db";
import { products, brands, categories, productImages } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { products as dummyProducts, type Product } from "@/lib/dummy-data";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("📦 소싱상품 조회 중...");

  let items: { name: string; brand: string; category: string; price: number; slug: string }[] = [];

  // 1) DB 시도
  if (hasDb()) {
    try {
      const database = db();
      const rows = await database
        .select({
          slug: products.slug,
          name: products.name,
          brand: brands.name,
          category: categories.slug,
          price: products.priceUsd,
        })
        .from(products)
        .innerJoin(brands, eq(products.brandId, brands.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            isNull(products.deletedAt),
            isNull(brands.deletedAt),
            eq(products.isDummy, false),
          ),
        )
        .orderBy(desc(products.createdAt));

      if (rows.length > 0) {
        items = rows.map((r) => ({
          slug: r.slug,
          name: r.name,
          brand: r.brand || "-",
          category: r.category || "sourced",
          price: Number(r.price),
        }));
        console.log(`✅ DB에서 ${items.length}개 상품 조회`);
      }
    } catch (err) {
      console.log("⚠️ DB 조회 실패, 더미 데이터로 폴백");
    }
  }

  // 2) 더미 데이터 폴백
  if (items.length === 0) {
    console.log("📋 더미 데이터 사용 중...");
    items = dummyProducts.map((p: Product) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
    }));
    console.log(`✅ 더미 데이터 ${items.length}개`);
  }

  // 카테고리별로 그룹화
  const grouped = new Map<string, typeof items>();

  for (const item of items) {
    const cat = item.category || "미분류";

    if (!grouped.has(cat)) {
      grouped.set(cat, []);
    }
    grouped.get(cat)!.push(item);
  }

  // MD 문서 생성
  const lines: string[] = [];
  lines.push("# 소싱상품 카테고리별 목록");
  lines.push("");
  lines.push(`**생성일**: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
  lines.push(`**총 상품 수**: ${items.length}개`);
  lines.push(`**카테고리 수**: ${grouped.size}개`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // 목차
  lines.push("## 목차");
  lines.push("");
  const sortedCats = Array.from(grouped.keys()).sort();
  for (const cat of sortedCats) {
    const count = grouped.get(cat)!.length;
    const anchor = cat.toLowerCase().replace(/[^a-z0-9가-힣]/g, "-");
    lines.push(`- [${cat}](#${anchor}) (${count}개)`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // 카테고리별 섹션
  for (const cat of sortedCats) {
    const catItems = grouped.get(cat)!;
    lines.push(`## ${cat} (${catItems.length}개)`);
    lines.push("");
    lines.push("| # | 상품명 | 브랜드 | 판매가(USD) | 소매가(USD) |");
    lines.push("|---|--------|--------|-------------|-------------|");

    catItems.forEach((item, idx) => {
      const price = item.price ? `$${item.price.toFixed(2)}` : "-";
      // 소매가 = (판매가 + 20) × 1.3
      const retailPrice = item.price ? (item.price + 20) * 1.3 : 0;
      const retail = retailPrice ? `$${retailPrice.toFixed(2)}` : "-";
      lines.push(`| ${idx + 1} | ${item.name} | ${item.brand} | ${price} | ${retail} |`);
    });

    lines.push("");
  }

  // 파일 저장
  const outputPath = path.join(process.cwd(), "docs", "sourcing-products-catalog.md");
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
  console.log(`\n📄 MD 문서 생성 완료: ${outputPath}`);

  // 요약 출력
  console.log("\n📊 카테고리별 요약:");
  for (const cat of sortedCats) {
    console.log(`  - ${cat}: ${grouped.get(cat)!.length}개`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 오류:", err);
  process.exit(1);
});
