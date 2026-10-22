import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import { catalogIndex, contentDocuments, exportJobs, exportShelf, productImages, products } from "../src/db/schema";
import { enqueueCrafted, promoteToShelf, updateShelf } from "../src/lib/export/shelf";
import { enqueueExport } from "../src/lib/export/jobs";
import { validateChannelExport } from "../src/lib/export/channel-projection";
import type { PdpStructured } from "../src/lib/pdp/ruleset";

const catalogIds = [5796, 5124, 5255, 5023, 4432, 5720, 5105, 5039, 5104, 3726, 3652, 3663, 4785, 3668, 5756, 4624, 5406, 4467, 3736, 6112, 6135, 6133, 6132, 6131, 6130, 5481, 5513, 5650, 6061, 6090];

async function main() {
  const database = db();
  await database.execute(sql`SELECT setval(pg_get_serial_sequence('export_shelf', 'id'), COALESCE((SELECT MAX(id) FROM export_shelf), 1), true)`);
  await database.execute(sql`SELECT setval(pg_get_serial_sequence('export_jobs', 'id'), COALESCE((SELECT MAX(id) FROM export_jobs), 1), true)`);
  const cardiganSlug = "sweet-pure-lace-bow-sweater-coat-for-women-2609010820201615500";
  const [cardigan] = await database.select({ id: products.id }).from(products).where(eq(products.slug, cardiganSlug)).limit(1);
  if (cardigan) await database.update(catalogIndex).set({ productId: cardigan.id }).where(eq(catalogIndex.id, 6130));
  const rows = await database
    .select({
      catalogId: catalogIndex.id,
      documentId: catalogIndex.documentId,
      productId: catalogIndex.productId,
      productSlug: products.slug,
      body: contentDocuments.body,
    })
    .from(catalogIndex)
    .leftJoin(contentDocuments, eq(contentDocuments.id, catalogIndex.documentId))
    .leftJoin(products, eq(products.id, catalogIndex.productId))
    .where(inArray(catalogIndex.id, catalogIds));

  if (rows.length !== catalogIds.length) throw new Error(`expected 30 catalog rows, found ${rows.length}`);

  const report: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    if (!row.documentId || !row.productId || !row.productSlug) throw new Error(`catalog ${row.catalogId}: missing PDP/product link`);
    const body = (row.body ?? {}) as { structured?: PdpStructured; assetUrls?: string[] };
    if (!body.structured) throw new Error(`catalog ${row.catalogId}: structured PDP missing`);

    await database.update(products).set({
      name: body.structured.title,
      description: body.structured.descriptionHtml,
      isDummy: false,
    }).where(eq(products.id, row.productId));
    await database.delete(productImages).where(eq(productImages.productId, row.productId));
    for (const [sort, url] of (body.assetUrls ?? []).entries()) {
      await database.insert(productImages).values({ productId: row.productId, url, sort, isDummy: false });
    }
    await database.update(contentDocuments).set({
      body: { ...(row.body as Record<string, unknown>), productId: row.productId },
      updatedAt: new Date(),
    }).where(eq(contentDocuments.id, row.documentId));

    const gate = validateChannelExport("amazon_au", body.structured, { id: row.catalogId } as never, body.assetUrls?.length ?? 0);
    if (!gate.ok) throw new Error(`catalog ${row.catalogId}: ${gate.errors.join("; ")}`);

    const crafted = await enqueueCrafted([row.documentId]);
    const shelfRow = crafted[0];
    if (!shelfRow) throw new Error(`catalog ${row.catalogId}: shelf enqueue failed`);
    await updateShelf(shelfRow.id, {
      catalogId: row.catalogId,
      channelsDesired: ["lexi", "amazon_au"],
      meta: { ...(shelfRow.meta ?? {}), amazonAuReady: true, amazonAuLocale: "en_AU" },
    });
    await promoteToShelf([shelfRow.id]);
    const jobs = await enqueueExport({ documentId: row.documentId, channels: ["amazon_au"] });

    report.push({
      catalogId: row.catalogId,
      productId: row.productId,
      documentId: row.documentId,
      slug: row.productSlug,
      shelfId: shelfRow.id,
      amazonJobId: jobs[0]?.id,
      amazonPreview: gate.projected,
    });
  }

  const [bestCount] = await database
    .select({ count: products.id })
    .from(products)
    .innerJoin(catalogIndex, eq(catalogIndex.productId, products.id))
    .where(inArray(catalogIndex.id, catalogIds));
  const shelfRows = await database.select().from(exportShelf).where(inArray(exportShelf.catalogId, catalogIds));
  const amazonJobs = await database.select().from(exportJobs).where(inArray(exportJobs.documentId, rows.map((r) => r.documentId!)));

  console.log(JSON.stringify({
    requested: 30,
    linkedProducts: rows.filter((r) => r.productId && r.documentId).length,
    shelfReady: shelfRows.filter((r) => r.stage === "shelf").length,
    amazonJobs: amazonJobs.filter((j) => j.channelCode === "amazon_au").length,
    report,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
