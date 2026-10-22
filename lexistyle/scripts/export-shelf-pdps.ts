/** Check PDP shelf-ready status and enqueue export */
import { listPdpDocuments, isShelfReadyPdp } from "@/lib/pdp/generate";
import { enqueueExport, processExportQueue } from "@/lib/export/jobs";

async function main() {
  const docs = await listPdpDocuments(200);
  console.log(`Total docs: ${docs.length}`);

  // Show all docs with their body fields
  for (const d of docs) {
    const dd = d as any;
    const body = dd.body || {};
    const title = String(dd.title ?? "").slice(0, 50);
    const engine = String(body.engine || dd.engine || "?");
    const shelfReady = body.shelfReady === true;
    const source = body.source || "-";
    console.log(`  docId=${dd.id}: "${title}" engine=${engine} shelfReady=${shelfReady} source=${source}`);
  }

  // Check shelf-ready status with fixed isShelfReadyPdp
  const shelf = docs.filter((d: any) => isShelfReadyPdp(d as any));
  console.log(`\nShelf-ready: ${shelf.length}`);

  // Export all shelf-ready docs
  let ok = 0;
  for (const doc of shelf) {
    const docId = (doc as any).id;
    try {
      console.log(`  [EXPORT] docId=${docId}`);
      await enqueueExport({
        documentId: docId,
        channels: ["lexi", "cafe24"],
        operation: "create",
      });
      ok++;
    } catch (e) {
      console.error(`  ✗ Export fail docId=${docId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`\nEnqueued exports: ${ok}`);

  if (ok > 0) {
    console.log("\nProcessing export queue...");
    const results = await processExportQueue(100);
    console.log(`  Done: ${results.filter((r: any) => r.ok).length}, Failed: ${results.filter((r: any) => !r.ok).length}`);
  }

  console.log("\n=== Export complete ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});