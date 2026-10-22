/**
 * 로컬 Postgres → Neon HQ 동기화
 *
 * 전제:
 *   DATABASE_URL      = 로컬 (127.0.0.1 / localhost)
 *   NEON_DATABASE_URL  = Neon (또는 DATABASE_URL_NEON)
 *
 * 사용:
 *   npm run db:sync:neon
 *   npm run db:sync:neon -- --dry-run
 *   npm run db:sync:neon -- --tables=catalog_index,export_shelf
 *
 * Neon 전송 쿼터: 동기화 순간에만 이그레스가 발생한다.
 * 개발 중 크롤/갱신을 로컬에만 하면 일상 소모는 거의 없고,
 * 올릴 때 용량만큼은 여전히 차감된다.
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
  "category_cj_leaves",
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

async function identityColumnsOf(client, name) {
  const r = await client.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name=$1 and is_identity='YES'
     order by ordinal_position`,
    [name],
  );
  return r.rows.map((x) => x.column_name);
}

async function jsonColumnsOf(client, name) {
  const r = await client.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name=$1 and data_type in ('json','jsonb')`,
    [name],
  );
  return new Set(r.rows.map((x) => x.column_name));
}

/** PK = id 인 테이블은 id 기준 upsert. 특수 키는 별도 */
const NATURAL_KEYS = {
  catalog_sync_checkpoints: ["supplier_code"],
  catalog_index: ["supplier_code", "external_id"],
  category_cj_leaves: ["cj_leaf"],
  export_jobs: ["idempotency_key"],
  hq_state: ["key"],
};

async function ensureUniqueIndex(neon, table, cols) {
  const idx = `ux_sync_${table}_${cols.join("_")}`.slice(0, 60);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  await neon.query(
    `create unique index if not exists "${idx}" on public."${table}" (${colList})`,
  );
  return cols;
}

async function syncTable(local, neon, table) {
  if (!(await tableExists(local, table))) {
    return { table, skipped: "missing-local" };
  }
  if (!(await tableExists(neon, table))) {
    return { table, skipped: "missing-neon — run migrate on Neon first" };
  }

  const localCols = await columnsOf(local, table);
  const neonCols = new Set(await columnsOf(neon, table));
  const cols = localCols.filter((c) => neonCols.has(c));
  if (!cols.length) return { table, skipped: "no-common-columns" };

  const identityCols = await identityColumnsOf(neon, table);
  const overrideIdentity = identityCols.length > 0;

  const { rows } = await local.query(`select ${cols.map((c) => `"${c}"`).join(",")} from public."${table}"`);
  if (!rows.length) return { table, synced: 0 };

  if (dryRun) return { table, wouldSync: rows.length };

  let conflictCols = NATURAL_KEYS[table] ?? (cols.includes("id") ? ["id"] : null);
  if (!conflictCols) {
    return { table, skipped: "no-conflict-key" };
  }

  // natural key가 id가 아니면 unique index 보장 — Neon에 중복이 있어 실패하면 id 기준으로 폴백
  if (!(conflictCols.length === 1 && conflictCols[0] === "id")) {
    try {
      await ensureUniqueIndex(neon, table, conflictCols);
    } catch (e) {
      if (!cols.includes("id")) return { table, error: `unique-index: ${e.message}` };
      console.warn(`  ${table}: unique-index 실패 → id 기준 upsert (${e.message})`);
      conflictCols = ["id"];
    }
  }

  const colSql = cols.map((c) => `"${c}"`).join(", ");
  const conflict = conflictCols.map((c) => `"${c}"`).join(", ");
  // GENERATED ALWAYS identity 컬럼은 UPDATE SET 불가 → 갱신 대상에서 제외
  const updates = cols
    .filter((c) => !conflictCols.includes(c) && !identityCols.includes(c))
    .map((c) => `"${c}" = excluded."${c}"`)
    .join(", ");

  // Postgres 문법: INSERT INTO t (cols) OVERRIDING SYSTEM VALUE VALUES (...)
  const overridingClause = overrideIdentity ? " overriding system value" : "";
  const insertSql = (rowCount) => {
    const valuesSql = Array.from({ length: rowCount }, (_, rowIndex) => {
      const placeholders = cols.map((_, colIndex) => `$${rowIndex * cols.length + colIndex + 1}`).join(", ");
      return `(${placeholders})`;
    }).join(", ");
    return updates
      ? `insert into public."${table}" (${colSql})${overridingClause} values ${valuesSql}
         on conflict (${conflict}) do update set ${updates}`
      : `insert into public."${table}" (${colSql})${overridingClause} values ${valuesSql}
         on conflict (${conflict}) do nothing`;
  };

  let ok = 0;
  let fail = 0;
  const jsonCols = await jsonColumnsOf(neon, table);
  const valuesOf = (row) =>
    cols.map((c) =>
      jsonCols.has(c) && row[c] !== null && typeof row[c] === "object" ? JSON.stringify(row[c]) : row[c],
    );
  // 원격 왕복을 줄이되 PostgreSQL 파라미터 상한(65,535개) 아래로 유지한다.
  const batchSize = Math.max(1, Math.min(100, Math.floor(60_000 / cols.length)));
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    try {
      await neon.query(insertSql(batch.length), batch.flatMap(valuesOf));
      ok += batch.length;
    } catch (batchError) {
      // 한 행의 데이터 문제로 정상 행까지 누락되지 않도록 실패 배치만 개별 재시도한다.
      for (const row of batch) {
        try {
          await neon.query(insertSql(1), valuesOf(row));
          ok += 1;
        } catch (e) {
          fail += 1;
          if (fail <= 3) console.error(`  ${table} row fail:`, e.message);
        }
      }
      if (fail === 0) console.warn(`  ${table}: batch fallback (${batchError.message})`);
    }
  }
  for (const col of identityCols.filter((c) => cols.includes(c))) {
    await neon
      .query(
        `select setval(pg_get_serial_sequence('public."${table}"', '${col}'),
           greatest((select coalesce(max("${col}"), 0) from public."${table}"), 1))`,
      )
      .catch((e) => console.warn(`  ${table}.${col} setval:`, e.message));
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

  console.log(`local → neon  sync${dryRun ? " (dry-run)" : ""}`);
  console.log(`  local: ${hostOf(LOCAL)}`);
  console.log(`  neon:  ${hostOf(NEON)}`);

  const local = new pg.Client({
    connectionString: LOCAL,
    ssl: false,
  });
  const neon = new pg.Client({
    connectionString: NEON,
    ssl: { rejectUnauthorized: false },
  });

  await local.connect();
  await neon.connect();

  const tables = onlyTables ?? DEFAULT_TABLES;
  const results = [];
  for (const t of tables) {
    process.stdout.write(`→ ${t} ... `);
    const r = await syncTable(local, neon, t);
    results.push(r);
    console.log(JSON.stringify(r));
  }

  await local.end();
  await neon.end();

  const synced = results.reduce((n, r) => n + (r.synced || 0), 0);
  const failed = results.reduce((n, r) => n + (r.failed || 0), 0);
  console.log(`done: synced=${synced} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
