import { catalogStats, latestSyncRun } from "@/lib/catalog/index-store";
import { listPdpDocuments } from "@/lib/pdp/generate";
import { listExports } from "@/lib/export/jobs";

export type PipelineProgress = {
  catalog: number;
  imported: number;
  pdp: number;
  exportJobs: number;
  exportQueued: number;
  exportFailed: number;
  crawl: {
    status: string;
    pagesDone: number;
    itemsUpserted: number;
    lastError: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  } | null;
};

export async function getPipelineProgress(supplierCode = "cjdropshipping"): Promise<PipelineProgress> {
  const stats = await catalogStats(supplierCode);
  const docs = await listPdpDocuments(200);
  const jobs = await listExports(80);
  const run = await latestSyncRun(supplierCode);
  return {
    catalog: stats.total,
    imported: stats.imported,
    pdp: docs.length,
    exportJobs: jobs.length,
    exportQueued: jobs.filter((j) => j.status === "queued" || j.status === "retry").length,
    exportFailed: jobs.filter((j) => j.status === "failed").length,
    crawl: run
      ? {
          status: run.status,
          pagesDone: run.pagesDone,
          itemsUpserted: run.itemsUpserted,
          lastError: run.lastError ?? null,
          startedAt: run.startedAt instanceof Date ? run.startedAt.toISOString() : (run.startedAt as string | null),
          finishedAt: run.finishedAt instanceof Date ? run.finishedAt.toISOString() : (run.finishedAt as string | null),
        }
      : null,
  };
}
