/**
 * 오해를 부르는 CJ 번역 카테고리명을 정정한다 (slug 기준, 멱등).
 *   node scripts/rename-categories.mjs --target=local|neon
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import pg from "pg";

// cj-boys-bags 안의 실제 상품은 성별 무관 백팩·가방이다
const RENAMES = { "cj-boys-bags": "백팩·가방", "cj-mens-clothing": "남성 의류" };

const target = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "local";
const url = target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await client.connect();
for (const [slug, name] of Object.entries(RENAMES)) {
  const r = await client.query("update categories set name=$1 where slug=$2 and name<>$1", [name, slug]);
  console.log(target, slug, "->", name, `(${r.rowCount})`);
}
await client.end();
