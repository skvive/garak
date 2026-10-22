/**
 * 로컬 JSON pdpDocs → Neon content_documents 동기화
 *
 * NEON_DATABASE_URL 필수.
 * 사용법: node scripts/sync-pdp-to-neon.mjs [--dry-run]
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
  const docs = Array.isArray(store.pdpDocs) ? store.pdpDocs : [];

  // Also sync export jobs if they have done status
  const exports = Array.isArray(store.exports) ? store.exports : [];

  console.log(`pdp → neon${dryRun ? " (dry-run)" : ""} host=${new URL(NEON).hostname}`);
  console.log(`  pdpDocs=${docs.length} exports=${exports.length} path=${STORE_PATH}`);

  // Show some stats
  const shelfReady = docs.filter(d => d.body?.shelfReady === true || d.body?.source === "hq-studio");
  console.log(`  Shelf-ready docs: ${shelfReady.length}`);

  if (dryRun) return;

  const client = new pg.Client({
    connectionString: NEON,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Ensure content_documents table
  await client.query(`
    create table if not exists content_documents (
      id bigserial primary key,
      kind text not null default 'pdp',
      title text not null default '',
      locale text not null default 'ko',
      status text not null default 'draft',
      body jsonb,
      rendered_html text,
      current_version integer not null default 1,
      created_by text default 'system',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `).catch(() => {});

  // Sync catalog_index.document_id
  // First, ensure catalog_index has document_id column
  await client.query(`
    do $$ begin
      if not exists (select 1 from information_schema.columns
        where table_name='catalog_index' and column_name='document_id') then
        alter table catalog_index add column document_id bigint;
      end if;
    end $$;
  `).catch(() => {});

  let ok = 0;
  let fail = 0;
  for (const doc of docs) {
    const id = doc.id;
    const title = doc.title ?? "Untitled PDP";
    const locale = doc.locale ?? "ko";
    const status = doc.status ?? "review";
    const body = doc.body ?? {};
    const renderedHtml = doc.renderedHtml ?? "";
    const currentVersion = doc.currentVersion ?? 1;
    const createdAt = doc.createdAt ?? new Date().toISOString();

    try {
      // Check if document exists
      const { rows } = await client.query(
        `select id from content_documents where id = $1`,
        [id],
      );

      if (rows.length > 0) {
        // Update
        await client.query(
          `update content_documents set
            title = $1, locale = $2, status = $3, body = $4::jsonb,
            rendered_html = $5, current_version = $6, updated_at = now()
           where id = $7`,
          [title, locale, status, JSON.stringify(body), renderedHtml, currentVersion, id],
        );
      } else {
        // Insert with specific ID — OVERRIDING SYSTEM VALUE for identity column
        await client.query(
          `insert into content_documents (id, kind, title, locale, status, body, rendered_html, current_version, created_by, created_at, updated_at)
           overriding system value
           values ($1, 'pdp', $2, $3, $4, $5::jsonb, $6, $7, 'system', $8::timestamptz, now())
           on conflict (id) do update set
             title = excluded.title, locale = excluded.locale, status = excluded.status,
             body = excluded.body, rendered_html = excluded.rendered_html,
             current_version = excluded.current_version, updated_at = now()`,
          [id, title, locale, status, JSON.stringify(body), renderedHtml, currentVersion, createdAt],
        );
      }

      // Update catalog_index.document_id if body has catalogId
      const catalogId = body.catalogId;
      if (catalogId != null) {
        await client.query(
          `update catalog_index set document_id = $1 where id = $2 and (document_id is null or document_id != $1)`,
          [id, catalogId],
        );
      }

      ok++;
      if (ok % 100 === 0) console.log(`  Synced ${ok}/${docs.length}...`);
    } catch (e) {
      fail++;
      if (fail <= 5) console.error(`  ✗ docId=${id}: ${e.message}`);
    }
  }

  // Sync export jobs
  let eOk = 0;
  let eFail = 0;
  for (const job of exports) {
    const id = job.id;
    const documentId = job.documentId;
    const channelCode = job.channelCode;
    const status = job.status;
    if (status !== "done") continue; // only sync completed exports

    try {
      await client.query(
        `insert into export_jobs (id, document_id, document_version, channel_code, operation, status,
          idempotency_key, request_payload, response_payload, external_ref, last_error, created_at, completed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12::timestamptz, $13::timestamptz)
         on conflict (id) do update set
           status = excluded.status,
           response_payload = excluded.response_payload,
           external_ref = excluded.external_ref,
           completed_at = excluded.completed_at`,
        [
          id,
          documentId,
          job.documentVersion ?? 1,
          channelCode,
          job.operation ?? "create",
          status,
          job.idempotencyKey ?? `exp:${documentId}:${channelCode}`,
          JSON.stringify(job.requestPayload ?? {}),
          JSON.stringify(job.responsePayload ?? {}),
          job.externalRef ?? null,
          job.lastError ?? null,
          job.createdAt ?? new Date().toISOString(),
          job.completedAt ?? new Date().toISOString(),
        ],
      );
      eOk++;
    } catch (e) {
      eFail++;
    }
  }

  await client.end();
  console.log(`\ndone! content_documents: ${ok}/${docs.length} fail=${fail}`);
  console.log(`export_jobs: ${eOk}/${exports.length} fail=${eFail}`);
}

main().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});