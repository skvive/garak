// scripts/fix-misclassified.mjs
// 여성 카테고리에 잘못 분류된 남성 전용 상품 4건을 남성 의류로 이동
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import pg from "pg";

const URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!URL) { console.error("No DB URL"); process.exit(1); }

const client = new pg.Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// 수정 대상: [id, 새 category_path[0], 새 lexCategoryId]
const FIXES = [
  { id: 225, leaf: "Men's Hats & Caps", lex: "men-clothing" },
  { id: 205, leaf: "Men's Hats & Caps", lex: "men-clothing" },
  { id: 213, leaf: "Men's Socks", lex: "men-clothing" },
  { id: 305, leaf: "Men's Socks", lex: "men-clothing" },
  // 남녀공용(Men's And Women's) 상품도 남성 의류로 이동
  { id: 336, leaf: "Men's Hats & Caps", lex: "men-clothing" },
  { id: 334, leaf: "Men's Hats & Caps", lex: "men-clothing" },
  { id: 244, leaf: "Men's Hats & Caps", lex: "men-clothing" },
];

const dryRun = process.argv.includes("--dry-run");

console.log(`=== 수정 대상 ${FIXES.length}건 ${dryRun ? "(DRY RUN)" : ""} ===`);

for (const f of FIXES) {
  const r = await client.query(
    `select id, title, category_path, raw_meta from catalog_index where id = $1`,
    [f.id]
  );
  if (r.rows.length === 0) { console.log(`[${f.id}] NOT FOUND`); continue; }
  const row = r.rows[0];
  console.log(`--- [${f.id}] ${row.title}`);
  console.log(`  기존 category_path: ${JSON.stringify(row.category_path)}`);
  console.log(`  기존 lexCategoryId: ${row.raw_meta?.lexCategoryId ?? "(none)"}`);

  if (dryRun) continue;

  // raw_meta 갱신 (categoryPath, lexCategoryId)
  const raw = row.raw_meta ?? {};
  raw.categoryPath = [f.leaf];
  raw.lexCategoryId = f.lex;

  await client.query(
    `update catalog_index
     set category_path = $1, raw_meta = $2, updated_at = now()
     where id = $3`,
    [[f.leaf], JSON.stringify(raw), f.id]
  );
  console.log(`  ✓ 수정 완료 → category_path=["${f.leaf}"], lexCategoryId=${f.lex}`);
}

await client.end();
console.log("\n=== 완료 ===");
