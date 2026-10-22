/**
 * P0/P1 smoke: mock crawl → search → import → pdp → export (no live CJ keys required)
 * npx tsx scripts/verify-catalog-pipeline.ts
 */
import { crawlCatalogChunk } from "../src/lib/catalog/crawl";
import { searchCatalog, catalogStats } from "../src/lib/catalog/index-store";
import { runImportMany } from "../src/lib/catalog/import";
import { generatePdpForCatalog, batchEditPdp, listPdpDocuments } from "../src/lib/pdp/generate";
import { enqueueExport, processExportQueue } from "../src/lib/export/jobs";

async function main() {
  console.log("1) crawl chunk…");
  const crawl = await crawlCatalogChunk("cjdropshipping", { reset: true, pages: 3 });
  console.log(crawl);

  const stats = await catalogStats("cjdropshipping");
  console.log("2) stats", stats);
  if (stats.total < 20) throw new Error("expected >=20 indexed from fixtures");

  const { items } = await searchCatalog({ supplier: "cjdropshipping", q: "Sample", limit: 5 });
  console.log("3) search", items.map((i) => i.title));
  if (!items.length) throw new Error("search empty");

  const ids = items.slice(0, 2).map((i) => i.id);
  console.log("4) import", ids);
  const imported = await runImportMany(ids);
  console.log(imported);

  console.log("5) pdp generate");
  const docs = [];
  for (const id of ids) {
    docs.push(await generatePdpForCatalog(id));
  }
  console.log(docs);

  const listed = await listPdpDocuments();
  console.log("6) batch edit", await batchEditPdp(
    listed.map((d) => (d as { id: number }).id),
    { ctaLabel: "장바구니 담기", tonePrefix: "LEXI ·" },
  ));

  const docId = docs[0]!.documentId;
  console.log("7) export", await enqueueExport({
    documentId: docId,
    channels: ["lexi", "coupang", "cafe24", "alibaba_package"],
  }));
  console.log(await processExportQueue(10));

  console.log("OK catalog pipeline smoke passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
