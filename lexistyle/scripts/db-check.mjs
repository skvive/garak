import { db } from "../src/db";
import { catalogIndex } from "../src/db/schema";
import { eq } from "drizzle-orm";

const d = db();
// 1) 임포트된 상품 수 확인
const [{ count }] = await d
  .select({ count: sql<number>`count(*)::int` })
  .from(catalogIndex)
  .where(eq(catalogIndex.importState, "imported"));
console.log("imported count:", count);

// 2) rawMeta에서 listedNum 있는지 샘플 확인
const samples = await d
  .select({ id: catalogIndex.id, title: catalogIndex.title, categoryPath: catalogIndex.categoryPath, rawMeta: catalogIndex.rawMeta })
  .from(catalogIndex)
  .where(eq(catalogIndex.importState, "imported"))
  .limit(5);
console.log("samples:", JSON.stringify(samples, null, 2));

// 3) importState별 분포
const states = await d
  .select({ state: catalogIndex.importState, count: sql<number>`count(*)::int` })
  .from(catalogIndex)
  .groupBy(catalogIndex.importState);
console.log("states:", JSON.stringify(states, null, 2));