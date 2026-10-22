// scripts/detect-misclassified.mjs
// 패션 카테고리 성별 분류 오류 탐지 (여성 카테고리에 남성 전용 상품)
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import pg from "pg";

const URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!URL) { console.error("No DB URL"); process.exit(1); }

const client = new pg.Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// 여성 패션 카테고리 L1 (소문자)
const FEMALE_L1 = [
  "lady dresses", "skirts", "blouses & shirts", "woman hats & caps", "woman socks",
  "women outerwear", "girl clothing sets", "lady", "women", "woman", "girl",
];

// 명확한 남성 전용 키워드 (men's/male/man/boy/gents 등 단독)
const MALE_ONLY_RE = /\b(men'?s|male|men\b(?!\s*and\s*women|\s*&\s*women|\s*women)|\bman\b(?!\s*and\s*women|\s*women)|\bboy'?s|\bgents|gentlemen)\b/i;

// 남녀공용 키워드 (제외)
const UNISEX_RE = /\b(men\s*and\s*women|men\s*&\s*women|women\s*and\s*men|unisex|for\s*men\s*and\s*women|men\s*women)\b/i;

// 여성 카테고리 상품 전체 조회
const r = await client.query(
  `select id, supplier_code, external_id, title, category_path
   from catalog_index
   where category_path is not null
     and lower(category_path[1]) = any($1::text[])
   order by category_path, title`,
  [FEMALE_L1]
);

// 남성 전용 키워드 있고 남녀공용 아님
const hits = r.rows.filter((x) => MALE_ONLY_RE.test(x.title) && !UNISEX_RE.test(x.title));
console.log(`=== 여성 카테고리 총 ${r.rows.length}건, 남성 전용 상품 ${hits.length}건 ===`);
hits.forEach((x) => {
  console.log(`[${x.id}] ${x.title}`);
  console.log(`    cat: ${JSON.stringify(x.category_path)}  supplier=${x.supplier_code} ext=${x.external_id}`);
});

await client.end();
