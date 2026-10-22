/** 잡 종류별 실행기 — import/pdp/export 실제 작업을 runJob에 연결 */
import { runJob } from "./runner";
import type { JobProgress } from "./types";

export type JobTarget = { refId: number; label: string };

export function startImportJob(targets: JobTarget[]): JobProgress {
  return runJob({
    kind: "import",
    targets,
    run: async ({ refId, onProgress }) => {
      onProgress(5);
      const { runImportJob } = await import("@/lib/catalog/import");
      onProgress(20);
      const result = await runImportJob(refId);
      onProgress(100);
      return { previewUrl: result.productId ? `/product/${result.slug}` : undefined };
    },
  });
}

export function startPdpJob(targets: JobTarget[]): JobProgress {
  const g = globalThis as unknown as { __lexiPdpInFlight?: Set<number> };
  if (!g.__lexiPdpInFlight) g.__lexiPdpInFlight = new Set();
  return runJob({
    kind: "pdp",
    targets,
    run: async ({ refId, onProgress }) => {
      if (g.__lexiPdpInFlight!.has(refId)) {
        throw new Error(`이미 생성 중인 상품입니다: #${refId}`);
      }
      g.__lexiPdpInFlight!.add(refId);
      try {
        onProgress(10);
        const { generatePdpForCatalog, getPdpDocument } = await import("@/lib/pdp/generate");
        const doc = await generatePdpForCatalog(refId);
        onProgress(90);
        const fresh = await getPdpDocument(doc.documentId);
        onProgress(100);
        return {
          previewUrl: fresh ? `/hq/pipeline/pdp?tab=${doc.documentId}` : undefined,
        };
      } finally {
        g.__lexiPdpInFlight!.delete(refId);
      }
    },
  });
}

export function startExportJob(targets: JobTarget[]): JobProgress {
  return runJob({
    kind: "export",
    targets,
    run: async ({ onProgress }) => {
      onProgress(50);
      const { processExportQueue } = await import("@/lib/export/jobs");
      await processExportQueue(20);
      onProgress(100);
    },
  });
}