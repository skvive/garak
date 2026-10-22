/**
 * CJ → 카탈로그 인덱스 → 자동 Import 배치 싱크
 * Lexistyle 카테고리(=CJ 카테고리)당 50개씩 크롤 후 Import
 */
import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { CJ_TOP_CATEGORIES, mapCjCategory } from "@/lib/catalog/cj-categories";
import { getConnector } from "@/lib/sourcing/registry";
import {
  upsertCatalogMeta,
  startSyncRun,
  finishSyncRun,
  searchCatalog,
} from "@/lib/catalog/index-store";
import { runImportJob } from "@/lib/catalog/import";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // 3분

/**
 * POST /api/hq/catalog/sync-all
 * Body: { categories?: string[], itemsPerCat?: number }
 * 
 * 각 렉시스타일 카테고리( = CJ 카테고리)별로 CJ 상품 50개씩 가져와서
 * catalog_index에 등록 후 Import 실행
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as {
      categories?: string[];
      itemsPerCat?: number;
      reset?: boolean;
    };

    // Lexistyle 카테고리 = CJ 카테고리(14) 기준
    const targetCats = body.categories?.length
      ? body.categories
      : CJ_TOP_CATEGORIES.map((c) => c.id);

    const itemsPerCat = Math.min(body.itemsPerCat ?? 50, 100);
    const supplierCode = "cjdropshipping";
    const connector = getConnector(supplierCode);
    if (!connector) return bad("cjdropshipping connector missing");

    const results: Record<string, { crawled: number; imported: number; errors: string[] }> = {};

    for (const catSlug of targetCats) {
      const catEntry = CJ_TOP_CATEGORIES.find((c) => c.id === catSlug);
      const koName = catEntry?.ko ?? catSlug;
      const catResult = { crawled: 0, imported: 0, errors: [] as string[] };

      try {
        const runId = await startSyncRun(`${supplierCode}-${catSlug}`);
        const pageSize = Math.min(50, itemsPerCat);
        const seenIds: string[] = [];
        let page = 1;
        let exhausted = false;

        // 카테고리별 크롤: 전체 페이지를 순회하며, 상품의 categoryPath[0]이 이 카테고리 ko와 일치하는 항목만 남긴다.
        // (CJ list는 category 필터를 지원하지 않으므로 클라이언트 필터)
        while (!exhausted && seenIds.length < itemsPerCat) {
          const listed = await connector.listCatalogPage?.({
            page,
            pageSize,
            category: koName, // 힌트로만 사용, 실제 필터는 아래
          } as any);

          if (!listed?.items.length) {
            exhausted = true;
            break;
          }

          for (const item of listed.items) {
            if (seenIds.length >= itemsPerCat) break;
            if (seenIds.includes(item.externalId)) continue;

            // 카테고리 매칭: 원문 leaf 또는 공식 1단 ko 라벨이 해당 카테고리에 속하는지
            const leafMatches = catEntry
              ? mapCjCategory(item.categoryPath ?? null) === koName ||
                (item.categoryPath ?? []).some((p) => p !== undefined && /beauty|hair|cosmetic|makeup/.test(String(p)) && catSlug === "beauty") ||
                (item.categoryPath ?? []).some((p) => /women|dress|blouse|fashion|men|pant/i.test(String(p)) && (catSlug === "women-clothing" || catSlug === "men-clothing"))
              : false;
            if (!leafMatches) continue;

            seenIds.push(item.externalId);

            const thumb = item.images[0]?.url ?? null;
            await upsertCatalogMeta({
              supplierCode,
              externalId: item.externalId,
              title: item.title,
              categoryPath: item.categoryPath,
              price: item.price,
              currency: item.currency,
              primaryThumbUrl: thumb,
              sellerName: item.sellerName ?? null,
              sourceUrl: item.url ?? null,
              rawMeta: {
                categoryPath: item.categoryPath,
                supplierId: item.sellerInfo?.supplierId ?? null,
                warehouse: item.sellerInfo?.warehouse ?? null,
              },
              syncRunId: runId,
            });
            catResult.crawled++;
          }
          page++;
          // 안전 가드: CJ는 total을 안 주므로 페이지 상한
          if (page > 150) exhausted = true;
        }

        await finishSyncRun(runId, {
          status: exhausted ? "completed" : "paused",
          pagesDone: page - 1,
          itemsUpserted: catResult.crawled,
        });

        // 3) 크롤된 항목 Import (최대 itemsPerCat)
        const searchResult = await searchCatalog({
          supplier: supplierCode,
          categories: [koName],
          limit: itemsPerCat,
          importState: "none",
          includeThumb: true,
        });

        for (const item of searchResult.items) {
          try {
            const importResult = await runImportJob(item.id);
            if (importResult.productId) catResult.imported++;
          } catch (e) {
            catResult.errors.push(`Import #${item.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } catch (e) {
        catResult.errors.push(`Category ${catSlug} failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      results[catSlug] = catResult;
    }

    const total = {
      crawled: Object.values(results).reduce((a, r) => a + r.crawled, 0),
      imported: Object.values(results).reduce((a, r) => a + r.imported, 0),
      errors: Object.values(results).reduce((a, r) => a + r.errors.length, 0),
    };

    return NextResponse.json({ results, total });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "sync-all failed", 500);
  }
}