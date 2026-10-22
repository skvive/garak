/** Process remaining exports and check failures */
import { listPdpDocuments, isShelfReadyPdp } from "@/lib/pdp/generate";
import { enqueueExport, processExportQueue, listExports } from "@/lib/export/jobs";

async function main() {
  // Check remaining shelf-ready docs
  const allDocs = await listPdpDocuments(500);
  const shelf = allDocs.filter((d: any) => isShelfReadyPdp(d as any));
  console.log(`All shelf-ready docs: ${shelf.length}`);

  // Check export status
  const exports = await listExports(500);
  console.log(`Exports total: ${exports.length}`);
  const done = exports.filter((e: any) => e.status === "done");
  const failed = exports.filter((e: any) => e.status === "failed");
  const queued = exports.filter((e: any) => e.status === "queued" || e.status === "retry");
  const mock = exports.filter((e: any) => /MOCK/i.test(String(e.externalRef ?? "")));
  console.log(`  Done: ${done.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`  Queued/Retry: ${queued.length}`);
  console.log(`  Mock: ${mock.length}`);

  // Show first 5 failures
  for (const f of failed.slice(0, 5)) {
    const fd = f as any;
    console.log(`  Failed docId=${fd.documentId} ch=${fd.channelCode}: ${fd.lastError?.slice(0, 200)}`);
  }

  // Show first 10 queued
  for (const q of queued.slice(0, 10)) {
    const qd = q as any;
    console.log(`  Queued docId=${qd.documentId} ch=${qd.channelCode}`);
  }

  // Only process remaining queued exports
  if (queued.length > 0) {
    console.log(`\nProcessing ${queued.length} queued exports...`);
    const results = await processExportQueue(200);
    const ok = results.filter((r: any) => r.ok).length;
    const fail = results.filter((r: any) => !r.ok).length;
    console.log(`  Done: ${ok}, Failed: ${fail}`);
    for (const r of results.slice(0, 10)) {
      if (!r.ok) console.log(`  ✗ exportId=${r.id}: ${r.error?.slice(0, 150)}`);
    }
  }

  // Enqueue exports for remaining docs that weren't exported yet
  const allExportDocIds = new Set(exports.map((e: any) => e.documentId));
  const pendingExport = shelf.filter((d: any) => !allExportDocIds.has(d.id));
  console.log(`\nPending export (no export job yet): ${pendingExport.length}`);

  if (pendingExport.length > 0) {
    let ok = 0;
    for (const doc of pendingExport) {
      try {
        await enqueueExport({
          documentId: doc.id,
          channels: ["lexi", "cafe24"],
          operation: "create",
        });
        ok++;
      } catch (e) {
        // skip
      }
    }
    console.log(`Enqueued ${ok} new exports. Processing...`);
    const results = await processExportQueue(200);
    console.log(`  Done: ${results.filter((r: any) => r.ok).length}, Failed: ${results.filter((r: any) => !r.ok).length}`);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);