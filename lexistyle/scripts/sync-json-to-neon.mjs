/**
 * ~/.lexi-local JSON 폴백 → Neon HQ 동기화 (Docker Postgres 없을 때)
 *
 * NEON_DATABASE_URL 필수.
 * npm run db:sync:json-neon
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync, existsSync } from "fs";
import path from "path";
import os from "os";
import pg from "pg";

const NEON =
  process.env.NEON_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_NEON?.trim() ||
  "";
const DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const dryRun = process.argv.includes("--dry-run");

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "?";
  }
}

async function upsertCatalog(client, row) {
  await client.query(
    `insert into catalog_index (
       supplier_code, external_id, title, category_path, min_price, max_price,
       currency, stock, primary_thumb_url, seller_name, source_url, searchable_text,
       content_hash, source_status, import_state, product_id, document_id, raw_meta, updated_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now()
     )
     on conflict (supplier_code, external_id) do update set
       title=excluded.title,
       category_path=excluded.category_path,
       min_price=excluded.min_price,
       max_price=excluded.max_price,
       stock=excluded.stock,
       primary_thumb_url=excluded.primary_thumb_url,
       seller_name=excluded.seller_name,
       source_url=excluded.source_url,
       searchable_text=excluded.searchable_text,
       content_hash=excluded.content_hash,
       source_status=excluded.source_status,
       import_state=excluded.import_state,
       product_id=excluded.product_id,
       document_id=excluded.document_id,
       raw_meta=excluded.raw_meta,
       updated_at=now()`,
    [
      row.supplierCode ?? "cjdropshipping",
      String(row.externalId ?? row.id),
      row.title ?? "Untitled",
      row.categoryPath ?? [],
      row.minPrice ?? null,
      row.maxPrice ?? null,
      row.currency ?? "USD",
      row.stock ?? 0,
      row.primaryThumbUrl ?? null,
      row.sellerName ?? null,
      row.sourceUrl ?? null,
      row.searchableText ?? null,
      row.contentHash ?? null,
      row.sourceStatus ?? "active",
      row.importState ?? "none",
      row.productId ?? null,
      row.documentId ?? null,
      row.rawMeta ? JSON.stringify(row.rawMeta) : null,
    ],
  );
}

async function upsertShelf(client, row) {
  await client.query(
    `insert into export_shelf (
       id, document_id, catalog_id, stage, title, title_ko, thumb_url,
       sell_price_usd, stock_default, options, channels_desired, meta, updated_at, created_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb, coalesce($13::timestamptz, now()), coalesce($14::timestamptz, now())
     )
     on conflict (id) do update set
       document_id=excluded.document_id,
       catalog_id=excluded.catalog_id,
       stage=excluded.stage,
       title=excluded.title,
       title_ko=excluded.title_ko,
       thumb_url=excluded.thumb_url,
       sell_price_usd=excluded.sell_price_usd,
       stock_default=excluded.stock_default,
       options=excluded.options,
       channels_desired=excluded.channels_desired,
       meta=excluded.meta,
       updated_at=now()`,
    [
      row.id,
      row.documentId,
      row.catalogId ?? null,
      row.stage ?? "crafted",
      row.title ?? null,
      row.titleKo ?? null,
      row.thumbUrl ?? null,
      row.sellPriceUsd ?? null,
      row.stockDefault ?? 10,
      JSON.stringify(row.options ?? null),
      row.channelsDesired ?? null,
      JSON.stringify(row.meta ?? null),
      row.updatedAt ?? null,
      row.createdAt ?? null,
    ],
  );
}

async function main() {
  if (!NEON) {
    console.error("NEON_DATABASE_URL required");
    process.exit(1);
  }
  if (!existsSync(STORE_PATH)) {
    console.error("local store missing:", STORE_PATH);
    process.exit(1);
  }
  const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
  const catalog = Array.isArray(store.catalog) ? store.catalog : [];
  const shelf = Array.isArray(store.exportShelf) ? store.exportShelf : [];
  console.log(`json → neon${dryRun ? " (dry-run)" : ""} host=${hostOf(NEON)}`);
  console.log(`  catalog=${catalog.length} shelf=${shelf.length} path=${STORE_PATH}`);
  if (dryRun) return;

  const client = new pg.Client({
    connectionString: NEON,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // natural keys
  await client.query(
    `create unique index if not exists ux_sync_catalog_index_supplier_external
     on catalog_index (supplier_code, external_id)`,
  ).catch(() => {});

  // export_shelf / title_ko may be missing until migrate
  await client.query(`
    create table if not exists export_shelf (
      id bigserial primary key,
      document_id bigint not null,
      catalog_id bigint,
      stage text not null default 'crafted',
      title text,
      title_ko text,
      thumb_url text,
      sell_price_usd numeric(12,2),
      stock_default integer not null default 10,
      options jsonb,
      channels_desired text[],
      meta jsonb,
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    )
  `).catch((e) => console.warn("export_shelf create:", e.message));

  let cOk = 0;
  let cFail = 0;
  for (const row of catalog) {
    try {
      await upsertCatalog(client, row);
      cOk += 1;
    } catch (e) {
      cFail += 1;
      if (cFail <= 3) console.error("catalog fail:", e.message);
    }
  }

  let sOk = 0;
  let sFail = 0;
  for (const row of shelf) {
    try {
      await upsertShelf(client, row);
      sOk += 1;
    } catch (e) {
      sFail += 1;
      if (sFail <= 3) console.error("shelf fail:", e.message);
    }
  }

  await client.end();
  console.log(`done catalog ${cOk}/${catalog.length} shelf ${sOk}/${shelf.length} fails=${cFail + sFail}`);
  if (cFail + sFail) process.exitCode = 1;
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
