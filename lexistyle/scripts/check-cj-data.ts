/** CJ catalog_index 데이터 현황 확인 */
import { db, hasDb } from "@/db";
import { catalogIndex } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function main() {
  if (!hasDb()) {
    console.log("❌ DB 없음 — 더미 데이터로 진행");
    process.exit(0);
  }
  const d = db();

  // 전체 개수
  const total = await d.select({ count: sql<number>`count(*)` }).from(catalogIndex);
  console.log("📊 catalog_index 전체:", total[0].count);

  // import 상태별
  const byState = await d
    .select({ state: catalogIndex.importState, count: sql<number>`count(*)` })
    .from(catalogIndex)
    .groupBy(catalogIndex.importState);
  console.log("📦 import 상태별:", JSON.stringify(byState));

  // imported 상품 샘플 (상위 5)
  const imported = await d
    .select({
      id: catalogIndex.id,
      title: catalogIndex.title,
      categoryPath: catalogIndex.categoryPath,
      minPrice: catalogIndex.minPrice,
      primaryThumbUrl: catalogIndex.primaryThumbUrl,
    })
    .from(catalogIndex)
    .where(eq(catalogIndex.importState, "imported"))
    .orderBy(desc(catalogIndex.indexedAt))
    .limit(5);
  console.log("\n🛍️  imported 샘플:");
  for (const r of imported) {
    console.log(`  [${r.id}] ${r.title} | $${r.minPrice} | cat: ${JSON.stringify(r.categoryPath)}`);
  }

  // 카테고리별 분포
  const catDist = await d
    .select({
      cat: sql<string>`category_path[1]` as any,
      count: sql<number>`count(*)`,
    })
    .from(catalogIndex)
    .where(eq(catalogIndex.importState, "imported"))
    .groupBy(sql`category_path[1]`)
    .orderBy(desc(sql`count(*)`));
  console.log("\n📂 카테고리별 imported 수:");
  for (const r of catDist) {
    console.log(`  ${r.cat}: ${r.count}개`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
