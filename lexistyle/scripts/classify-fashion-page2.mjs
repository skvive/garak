import { readFile, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });

const inputPath = process.argv[2] ?? "tmp/fashion-page-2-products.json";
const outputPath = process.argv[3] ?? "tmp/fashion-page-2-enriched.json";
const parsed = JSON.parse(await readFile(inputPath, "utf8"));
const products = parsed.products ?? [];
const externalIds = products.map((product) => product.slug.match(/(\d{16,})$/)?.[1]).filter(Boolean);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const result = await client.query(
  `select ci.id, ci.external_id, ci.title, ci.category_path, ci.primary_thumb_url, ci.source_url,
          ci.product_id, ci.document_id, ci.import_state, ci.source_status,
          cd.title as document_title, cd.status as document_status,
          cd.body as document_body
     from catalog_index ci
     left join content_documents cd on cd.id = ci.document_id
    where ci.external_id = any($1::text[])`,
  [externalIds],
);
await client.end();

const byExternalId = new Map(result.rows.map((row) => [String(row.external_id), row]));
const enriched = products.map((product) => {
  const externalId = product.slug.match(/(\d{16,})$/)?.[1] ?? "";
  const catalog = byExternalId.get(externalId) ?? null;
  return { ...product, externalId, catalog };
});

await writeFile(
  outputPath,
  `${JSON.stringify({ sourceUrl: parsed.sourceUrl, count: enriched.length, matched: result.rows.length, products: enriched }, null, 2)}\n`,
  "utf8",
);

console.log(`catalog matched ${result.rows.length}/${enriched.length}`);
for (const item of enriched) {
  const path = item.catalog?.category_path?.join(" > ") ?? "NO_LOCAL_ROW";
  const doc = item.catalog?.document_title ? ` (${item.catalog.document_title})` : "";
  console.log(`${String(item.index).padStart(2, "0")}\tci=${item.catalog?.id ?? "-"}\tdoc=${item.catalog?.document_id ?? "-"}${doc}\t${path}\t${item.title}`);
}
