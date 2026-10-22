/**
 * Neon → 로컬 JSON 스토어 역방향 동기화 (Neon DB → ~/.lexi-local)
 *
 * CJ 드롭십 카탈로그를 Neon에서 로컬 JSON 스토어로 가져온다.
 * DATABASE_URL이 비어 있을 때만 동작 (로컬 JSON 모드 확인).
 *
 * 사용법:
 *   node scripts/sync-neon-to-json.mjs              # 전체 동기화
 *   node scripts/sync-neon-to-json.mjs --dry-run     # 건수만 확인
 *   node scripts/sync-neon-to-json.mjs --categories=women-clothing,beauty  # 특정 카테고리만
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
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

// 카테고리 필터
const catArg = process.argv.find((a) => a.startsWith("--categories="));
const CATEGORY_FILTER = catArg
  ? catArg.split("=")[1].split(",").map((c) => c.trim())
  : null;

async function main() {
  if (!NEON) {
    console.error("NEON_DATABASE_URL required — set in .env.local");
    process.exit(1);
  }

  // 로컬 스토어 읽기
  let store = {};
  if (existsSync(STORE_PATH)) {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    console.log(`로컬 기존: catalog=${(store.catalog ?? []).length}건`);
  }
  const existingCatalog = store.catalog ?? [];

  const client = new pg.Client({
    connectionString: NEON,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const host = new URL(NEON).hostname;
  console.log(`Neon → JSON${dryRun ? " (dry-run)" : ""} host=${host}`);

  // catalog_index 전체 조회
  let whereClause = "";
  const params = [];
  if (CATEGORY_FILTER) {
    // categoryPath[0] 기준 필터
    const likes = CATEGORY_FILTER.map((cat, i) => {
      params.push(cat);
      return `category_path[1] = $${params.length}`;
    }).join(" OR ");
    whereClause = `AND (${likes})`;
  }

  const result = await client.query(
    `SELECT id, supplier_code, external_id, title, category_path,
            min_price, max_price, currency, stock, primary_thumb_url,
            seller_name, source_url, searchable_text, content_hash,
            source_status, import_state, product_id, document_id, raw_meta,
            indexed_at, updated_at
     FROM catalog_index
     WHERE source_status = 'active' ${whereClause}
     ORDER BY id`,
  );
  const rows = result.rows;
  console.log(`Neon 조회: ${rows.length}건 활성 카탈로그`);

  // 카테고리별 집계
  const catGroups = {};
  for (const r of rows) {
    const cat = r.category_path?.[0] ?? "unknown";
    catGroups[cat] = (catGroups[cat] || 0) + 1;
  }
  console.log("\n카테고리 분포:");
  for (const [cat, count] of Object.entries(catGroups).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}건`);
  }

  if (dryRun) {
    console.log(`\n[dry-run] 0건 업로드. --dry-run 제거 후 실행하세요.`);
    await client.end();
    return;
  }

  // 로컬 JSON으로 변환
  const imported = rows.map((r) => ({
    id: r.id,
    supplierCode: r.supplier_code,
    externalId: String(r.external_id ?? r.id),
    title: r.title ?? "Untitled",
    titleKo: null, // 번역은 로컬에서 lazy 생성
    categoryPath: r.category_path ?? [],
    minPrice: r.min_price != null ? String(r.min_price) : null,
    maxPrice: r.max_price != null ? String(r.max_price) : null,
    currency: r.currency ?? "USD",
    stock: r.stock ?? -1,
    primaryThumbUrl: r.primary_thumb_url ?? null,
    sellerName: r.seller_name ?? null,
    sourceUrl: r.source_url ?? null,
    searchableText: r.searchable_text ?? null,
    contentHash: r.content_hash ?? null,
    sourceStatus: r.source_status ?? "active",
    importState: r.import_state ?? "none",
    productId: r.product_id ?? null,
    documentId: r.document_id ?? null,
    rawMeta: r.raw_meta ?? null,
    indexedAt: new Date(r.indexed_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));

  // 기존 카탈로그 교체 (supplierCode = cjdropshipping만)
  const keptOther = existingCatalog.filter(
    (c) => c.supplierCode !== "cjdropshipping",
  );
  const newCatalog = [...keptOther, ...imported];

  // 스토어 저장
  store.catalog = newCatalog;
  store.catalogSeq = imported.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  // 기존 pdpDocs는 유지 (더미만 나중에 purge)
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");

  console.log(`\n=== 동기화 완료 ===`);
  console.log(`  Neon CJ 활성: ${rows.length}건`);
  console.log(`  로컬 catalog: ${keptOther.length} → ${newCatalog.length}건 (기타 supplier=${keptOther.length})`);
  console.log(`  저장: ${STORE_PATH}`);

  await client.end();
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});