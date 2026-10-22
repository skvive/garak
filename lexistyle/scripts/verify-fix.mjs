// scripts/verify-fix.mjs
// 수정 결과 검증 + 남녀공용 3건 확인
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import pg from "pg";

const URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!URL) { console.error("No DB URL"); process.exit(1); }

const client = new pg.Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// 수정된 4건 검증
const r = await client.query(
  `select id, title, category_path, raw_meta->>'lexCategoryId' as lex
   from catalog_index where id in (225,205,213,305) order by id`
);
console.log("=== 수정된 4건 검증 ===");
r.rows.forEach((x) => console.log(`[${x.id}] ${JSON.stringify(x.category_path)} lex=${x.lex} | ${x.title.slice(0,50)}`));

// 남녀공용 3건 확인
const r2 = await client.query(
  `select id, title, category_path from catalog_index where id in (336,334,244) order by id`
);
console.log("\n=== 남녀공용 3건 (검토 대상) ===");
r2.rows.forEach((x) => console.log(`[${x.id}] ${JSON.stringify(x.category_path)} | ${x.title.slice(0,60)}`));

// 여성 카테고리에 남은 남성 전용 상품 재탐지 (잔여 확인)
const r3 = await client.query(
  `select id, title, category_path from catalog_index
   where category_path is not null
     and lower(category_path[1]) in ('lady dresses','skirts','blouses & shirts','woman hats & caps','woman socks','women outerwear','girl clothing sets','lady','women','woman','girl')
     and lower(title) ~ '\\b(men|male)\\b'
   order by id`
);
console.log(`\n=== 여성 카테고리 잔여 남성 상품: ${r3.rows.length}건 ===`);
r3.rows.forEach((x) => console.log(`[${x.id}] ${JSON.stringify(x.category_path)} | ${x.title.slice(0,60)}`));

await client.end();
