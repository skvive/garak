/**
 * Neon → 로컬 Postgres 동기화
 *
 * 전제:
 *   DATABASE_URL      = 로컬 (127.0.0.1 / localhost)
 *   NEON_DATABASE_URL  = Neon
 *
 * 사용:
 *   npm run db:sync:neon-to-local
 *   npm run db:sync:neon-to-local -- --dry-run
 *   npm run db:sync:neon-to-local -- --tables=catalog_index,export_shelf
 *
 * 용도: 프로덕션(Neon)의 실 데이터를 로컬 개발 DB로 가져오기
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import pg from "pg";

const LOCAL =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://lexi:lexi@127.0.0.1:5432/lexi";
const NEON =
  process.env.NEON_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_NEON?.trim() ||
  "";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const tablesArg = args.find((a) => a.startsWith("--tables="));
const onlyTables = tablesArg
  ? tablesArg
      .slice("--tables=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

/** HQ 파이프라인 우선 — 스토어프론트 대량 테이블은 기본 제외 */
const DEFAULT_TABLES = [
  "catalog_sync_checkpoints",
  "catalog_sync_runs",
  "catalog_index",
  "asset_cache",
  "import_jobs",
  "content_documents",
  "content_versions",
  "media_assets",
  "generation_jobs",
  "export_jobs",
  "export_shelf",
  "hq_state",
];

function isLocalUrl(url) {
  try {
    const u = new URL(url);
    return ["localhost", "127.0.0.1", "postgres"].includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "?";
  }
}

async function tableExists(client, name) {
  const r = await client.query(
    `select 1 from information_schema.tables where table_schema='public' and table_name=$1`,
    [name],
  );
  return r.rowCount > 0;
}

async function columnsOf(client, name) {
  const r = await client.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name=$1
     order by ordinal_position`,
    [name],
  );
  return r.rows.map((x) => x.column_name);
}

/** PK = id 인 테이블은 id 기준 upsert. 특수 키는 별도 */
const NATURAL_KEYS = {
  catalog_sync_checkpoints: ["supplier_code"],
  catalog_index: ["supplier_code", "external_id"],
  export_jobs: ["idempotency_key"],
  hq_state: ["key"],
};

// node-postgres encodes a JavaScript array as a Postgres array literal. That
// is invalid for json/jsonb columns when the JSON value itself is an array.
// Normalize known JSON columns before binding parameters.
const JSON_COLUMNS = new Set([
  "raw_meta",
  "category_override",
  "config",
  "meta",
  "body",
  "affected",
  "payload",
  "tokens",
  "request_payload",
  "response_payload",
  "options",
  "input",
  "output",
  "value",
  "error_rows",
  "assets",
  "design_doc",
  "margin_policy",
  "metadata",
  "shipping_address",
  "metrics",
  "previous_snapshot",
  "raw_row",
  "data",
  "script_data",
  "order_payload",
  "images",
  "option_schema",
  "seller_info",
  "connector_config",
]);

function bindValue(column, value) {
  if (value == null || !JSON_COLUMNS.has(column) || typeof value === "string") return value;
  return JSON.stringify(value);
}

async function ensureUniqueIndex(client, table, cols) {
  const idx = `ux_sync_${table}_${cols.join("_")}`.slice(0, 60);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  await client.query(
    `create unique index if not exists "${idx}" on public."${table}" (${colList})`,
  );
  return cols;
}

async function syncTable(source, dest, table) {
  if (!(await tableExists(source, table))) {
    return { table, skipped: "missing-source" };
  }
  if (!(await tableExists(dest, table))) {
    return { table, skipped: "missing-dest" };
  }

  const sourceCols = await columnsOf(source, table);
  const destCols = new Set(await columnsOf(dest, table));
  const cols = sourceCols.filter((c) => destCols.has(c));
  if (!cols.length) return { table, skipped: "no-common-columns" };

  const { rows } = await source.query(`select ${cols.map((c) => `"${c}"`).join(",")} from public."${table}"`);
  if (!rows.length) return { table, synced: 0 };

  if (dryRun) return { table, wouldSync: rows.length };

  const conflictCols = NATURAL_KEYS[table] ?? (cols.includes("id") ? ["id"] : null);
  if (!conflictCols) {
    return { table, skipped: "no-conflict-key" };
  }

  // natural key가 id가 아니면 unique index 보장
  if (!(conflictCols.length === 1 && conflictCols[0] === "id")) {
    try {
      await ensureUniqueIndex(dest, table, conflictCols);
    } catch (e) {
      return { table, error: `unique-index: ${e.message}` };
    }
  }

  const colSql = cols.map((c) => `"${c}"`).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const conflict = conflictCols.map((c) => `"${c}"`).join(", ");
  const updates = cols
    .filter((c) => !conflictCols.includes(c) && c !== "id")
    .map((c) => `"${c}" = excluded."${c}"`)
    .join(", ");

  // identity 컬럼(generated always)에 직접 값이 들어갈 수 있게 OVERRIDING SYSTEM VALUE
  const overrideClause = cols.includes("id") ? " overriding system value " : "";
  const sql = updates
    ? `insert into public."${table}" (${colSql})${overrideClause}values (${placeholders})
       on conflict (${conflict}) do update set ${updates}`
    : `insert into public."${table}" (${colSql})${overrideClause}values (${placeholders})
       on conflict (${conflict}) do nothing`;

  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const values = cols.map((c) => bindValue(c, row[c]));
    try {
      await dest.query(sql, values);
      ok += 1;
    } catch (e) {
      fail += 1;
      if (fail <= 3) console.error(`  ${table} row fail:`, e.message);
    }
  }
  return { table, synced: ok, failed: fail, total: rows.length };
}

async function main() {
  if (!NEON) {
    console.error("NEON_DATABASE_URL (또는 DATABASE_URL_NEON) 이 필요합니다.");
    process.exit(1);
  }
  if (!isLocalUrl(LOCAL)) {
    console.error(
      `DATABASE_URL 이 로컬이 아닙니다 (host=${hostOf(LOCAL)}). 로컬 Postgres로 바꾼 뒤 다시 실행하세요.`,
    );
    process.exit(1);
  }
  if (isLocalUrl(NEON)) {
    console.error("NEON_DATABASE_URL 이 로컬입니다. Neon 연결 문자열을 넣으세요.");
    process.exit(1);
  }

  console.log(`neon → local  sync${dryRun ? " (dry-run)" : ""}`);
  console.log(`  neon:  ${hostOf(NEON)}`);
  console.log(`  local: ${hostOf(LOCAL)}`);

  const neonClient = new pg.Client({
    connectionString: NEON,
    ssl: { rejectUnauthorized: false },
  });
  const localClient = new pg.Client({
    connectionString: LOCAL,
    ssl: false,
  });

  await neonClient.connect();
  await localClient.connect();

  const tables = onlyTables ?? DEFAULT_TABLES;
  const results = [];
  for (const t of tables) {
    process.stdout.write(`→ ${t} ... `);
    const r = await syncTable(neonClient, localClient, t);
    results.push(r);
    console.log(JSON.stringify(r));
  }

  await neonClient.end();
  await localClient.end();

  const synced = results.reduce((n, r) => n + (r.synced || 0), 0);
  const failed = results.reduce((n, r) => n + (r.failed || 0), 0);
  console.log(`done: synced=${synced} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
