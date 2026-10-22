/** Checkpoint crawl — 페이지 청크만 처리 (전량 한 요청 금지) */
import { getConnector } from "@/lib/sourcing/registry";
import {
  finishSyncRun,
  getCheckpoint,
  pruneMissingCatalog,
  saveCheckpoint,
  startSyncRun,
  upsertCatalogMeta,
} from "./index-store";

function crawlPages() {
  const n = Number(process.env.CATALOG_CRAWL_PAGES || 5);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 5;
}

export async function crawlCatalogChunk(supplierCode: string, opts?: { reset?: boolean; pages?: number }) {
  const connector = getConnector(supplierCode);
  if (!connector) throw new Error(`no connector: ${supplierCode}`);

  let cp = await getCheckpoint(supplierCode);
  // CJ list API는 total 없이 반환 → 페이지가 비정상적으로 높이 쌓인 체크포인트는 1로 리셋
  // (예: nextPage>5000 또는 잘못된 파편). 정상 진행은 그대로 둔다.
  if (opts?.reset || cp.nextPage > 5000) {
    cp = { supplierCode, nextPage: 1, pageSize: cp.pageSize || 20, runId: null };
  }

  const runId = cp.runId && !opts?.reset ? cp.runId : await startSyncRun(supplierCode);
  const pages = opts?.pages ?? crawlPages();
  let page = cp.nextPage;
  let pagesDone = 0;
  let upserted = 0;
  let seen = 0;
  let total: number | null = null;
  let exhausted = false;
  let lastError: string | null = null;
  // CJ list는 total 없이 반환 → 중복 externalId 감지로 종료 판정 (무한 페이지 방지)
  const seenExternals = new Set<string>();
  let dupStreak = 0;

  try {
    for (let i = 0; i < pages; i++) {
      const pageSize = cp.pageSize || 20;
      const listed = connector.listCatalogPage
        ? await connector.listCatalogPage({ page, pageSize })
        : { items: await connector.listProducts({ page, pageSize }), total: null as number | null };
      const batch = listed.items;
      if (listed.total != null) total = listed.total;
      if (!batch.length) {
        exhausted = true;
        break;
      }
      const allSeen = batch.every((b) => seenExternals.has(String(b.externalId)));
      if (allSeen) {
        dupStreak++;
        if (dupStreak >= 2) {
          exhausted = true; // 2페이지 연속 전부 중복 = 순회 완료
          break;
        }
      } else {
        dupStreak = 0;
      }
      for (const b of batch) seenExternals.add(String(b.externalId));
      seen += batch.length;
      for (const remote of batch) {
        const thumb = remote.images[0]?.url ?? null;
        const result = await upsertCatalogMeta({
          supplierCode,
          externalId: remote.externalId,
          title: remote.title,
          categoryPath: remote.categoryPath,
          price: remote.price,
          currency: remote.currency,
          // stock 생략 — 리스트 listedNum은 재고가 아님. 기존 검증 재고 보존
          primaryThumbUrl: thumb,
          sellerName: remote.sellerName ?? null,
          sourceUrl: remote.url ?? null,
          rawMeta: {
            categoryPath: remote.categoryPath,
            supplierId: remote.sellerInfo?.supplierId ?? null,
            warehouse: remote.sellerInfo?.warehouse ?? null,
            phone: remote.sellerInfo?.phone ?? null,
            email: remote.sellerInfo?.email ?? null,
            homepage: remote.sellerInfo?.homepage ?? null,
            listedNum: remote.listedNum ?? null,
          },
          syncRunId: runId,
        });
        if (result !== "unchanged") upserted += 1;
      }
      pagesDone += 1;
      page += 1;
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }

  await saveCheckpoint({
    supplierCode,
    nextPage: exhausted ? 1 : page,
    pageSize: cp.pageSize || 20,
    runId: exhausted ? null : runId,
  });

  await finishSyncRun(runId, {
    status: lastError ? "failed" : exhausted ? "completed" : "paused",
    pagesDone,
    itemsUpserted: upserted,
    lastError,
  });

  const prune =
    exhausted && !lastError ? await pruneMissingCatalog(supplierCode, runId) : null;

  return {
    supplierCode,
    runId,
    pagesDone,
    upserted,
    seen,
    total,
    nextPage: exhausted ? 1 : page,
    exhausted,
    prune,
    error: lastError,
  };
}
