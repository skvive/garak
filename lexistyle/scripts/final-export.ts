/** Final export — LEXI channel only, all shelf-ready docs */
import { listPdpDocuments, isShelfReadyPdp } from "@/lib/pdp/generate";
import { enqueueExport, processExportQueue, listExports } from "@/lib/export/jobs";

async function main() {
  const allDocs = await listPdpDocuments(500);
  console.log(`All PDP docs: ${allDocs.length}`);

  const shelf = allDocs.filter((d: any) => isShelfReadyPdp(d as any));
  console.log(`Shelf-ready: ${shelf.length}`);

  // Get existing export jobs by docId
  const existing = await listExports(600);
  const exportedDocIds = new Set(existing.map((e: any) => e.documentId));
  console.log(`Existing export jobs: ${existing.length}`);

  // Export shelf-ready docs that don't have LEXI-channel exports
  let count = 0;
  for (const doc of shelf) {
    const docId = doc.id;
    if (exportedDocIds.has(docId)) continue; // already enqueued
    try {
      await enqueueExport({
        documentId: docId,
        channels: ["lexi"],
        operation: "create",
      });
      count++;
      if (count % 50 === 0) console.log(`  Enqueued ${count}...`);
    } catch (e) {
      console.error(`  ✗ Export error docId=${docId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`\nNewly enqueued: ${count}`);

  // Process queue (lexi channel only now)
  const queued = (await listExports(600)).filter((e: any) =>
    e.status === "queued" || e.status === "retry"
  );
  console.log(`Queued to process: ${queued.length}`);

  while (true) {
    const results = await processExportQueue(25);
    const ok = results.filter((r: any) => r.ok).length;
    const fail = results.filter((r: any) => !r.ok).length;
    const running = (await listExports(600)).filter((e: any) =>
      e.status === "queued" || e.status === "retry"
    ).length;
    console.log(`  Processed: +${ok} ok, +${fail} fail — remaining: ${running}`);
    if (running === 0) break;
    if (results.length === 0) break;
  }

  // Final stats
  const allResults = await listExports(600);
  const done = allResults.filter((e: any) => e.status === "done");
  const failed = allResults.filter((e: any) => e.status === "failed");
  console.log(`\n=== FINAL ===`);
  console.log(`Total: ${allResults.length}, Done: ${done.length}, Failed: ${failed.length}`);
}

main().catch(console.error);