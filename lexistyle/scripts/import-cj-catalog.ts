/**
 * CJ API로 수집한 5,000개 상품을 catalog_index DB에 임포트
 * Usage: npx tsx scripts/import-cj-catalog.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { cjConnector, cjConfigured } from "@/lib/sourcing/connectors/cjdropshipping";
import { db } from "@/db";
import { catalogIndex } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function crawlAndImport(maxPages = 100) {
  if (!cjConfigured()) {
    console.error("❌ CJ API 설정이 없습니다");
    process.exit(1);
  }

  const database = db();
  const pageSize = 50;
  let totalImported = 0;
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  console.log("🚀 CJ 카탈로그 DB 임포트 시작...\n");

  for (let page = 1; page <= maxPages; page++) {
    try {
      const result = await cjConnector.listCatalogPage!({ page, pageSize });
      const items = result.items;

      if (!items.length) {
        console.log(`페이지 ${page}: 빈 결과 — 종료`);
        break;
      }

      for (const item of items) {
        const externalId = item.externalId;
        const supplierCode = "cjdropshipping";

        // 기존 상품 확인
        const [existing] = await database
          .select()
          .from(catalogIndex)
          .where(
            and(
              eq(catalogIndex.supplierCode, supplierCode),
              eq(catalogIndex.externalId, externalId)
            )
          )
          .limit(1);

        const contentHash = `${item.title}-${item.price}-${item.listedNum || 0}`;

        if (existing) {
          if (existing.contentHash === contentHash) {
            skippedCount++;
            continue;
          }
          // 업데이트
          await database
            .update(catalogIndex)
            .set({
              title: item.title,
              categoryPath: item.categoryPath || [],
              minPrice: String(item.price),
              maxPrice: String(item.price),
              currency: item.currency || "USD",
              stock: item.stock,
              primaryThumbUrl: item.images?.[0]?.url || null,
              sellerName: item.sellerName || null,
              sourceUrl: item.url || null,
              searchableText: `${item.title} ${(item.categoryPath || []).join(" ")} ${item.sellerName || ""}`.toLowerCase(),
              contentHash,
              sourceStatus: "active",
              importState: "none",
              rawMeta: {
                categoryPath: item.categoryPath || [],
                listedNum: item.listedNum || null,
              },
              updatedAt: new Date(),
            })
            .where(eq(catalogIndex.id, existing.id));
          updatedCount++;
        } else {
          // 신규 삽입
          await database.insert(catalogIndex).values({
            supplierCode,
            externalId,
            title: item.title,
            categoryPath: item.categoryPath || [],
            minPrice: String(item.price),
            maxPrice: String(item.price),
            currency: item.currency || "USD",
            stock: item.stock,
            primaryThumbUrl: item.images?.[0]?.url || null,
            sellerName: item.sellerName || null,
            sourceUrl: item.url || null,
            searchableText: `${item.title} ${(item.categoryPath || []).join(" ")} ${item.sellerName || ""}`.toLowerCase(),
            contentHash,
            sourceStatus: "active",
            importState: "none",
            rawMeta: {
              categoryPath: item.categoryPath || [],
              listedNum: item.listedNum || null,
            },
          });
          newCount++;
        }
        totalImported++;
      }

      const total = result.total;
      console.log(
        `페이지 ${page}/${total ? Math.ceil(total / pageSize) : "?"} — ${items.length}개 (누적 ${totalImported}) [신규:${newCount} 수정:${updatedCount} 동일:${skippedCount}]`
      );

      if (total && totalImported >= total) break;

      // Rate limit protection
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.error(`페이지 ${page} 오류:`, (e as Error).message);
      break;
    }
  }

  console.log(`\n✅ 임포트 완료`);
  console.log(`   신규: ${newCount}개`);
  console.log(`   수정: ${updatedCount}개`);
  console.log(`   동일: ${skippedCount}개`);
  console.log(`   총계: ${totalImported}개`);
}

crawlAndImport().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
