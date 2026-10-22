import { db } from "../src/db";
import { catalogIndex } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const d = db();
  // 1) 임포트된 상품 수 확인
  const [countRow] = await d
    .select({ count: sql<number>`count(*)::int` })
    .from(catalogIndex)
    .where(eq(catalogIndex.importState, "imported"));
  console.log("imported products count:", countRow?.count ?? 0);

  // 2) rawMeta 샘플 확인
  const samples = await d
    .select({ id: catalogIndex.id, title: catalogIndex.title, categoryPath: catalogIndex.categoryPath, rawMeta: catalogIndex.rawMeta })
    .from(catalogIndex)
    .where(eq(catalogIndex.importState, "imported"))
    .limit(5);
  for (const s of samples) {
    console.log(`\nid=${s.id} title=${s.title?.slice(0, 40)} categoryPath=${JSON.stringify(s.categoryPath)} meta=${JSON.stringify(s.rawMeta ?? {}).slice(0, 300)}`);
  }

  // 3) importState별 분포
  const states = await d
    .select({ state: catalogIndex.importState, count: sql<number>`count(*)::int` })
    .from(catalogIndex)
    .groupBy(catalogIndex.importState);
  console.log("\nimport states:", JSON.stringify(states, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });