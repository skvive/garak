/**
 * CJ 원본 분류 오류를 상품명 키워드로 바로잡는다 (slug 기준, 멱등).
 *   node scripts/reclassify-products.mjs --target=local|neon [--apply]   (기본 dry-run)
 * - 의류 규칙은 의류 leaf(또는 한글 제목·잡동사니 leaf)에 있는 상품에만 적용
 * - 남성 leaf 상품은 여성 표기가 있을 때만 이동 / "남녀공용"은 그대로 둔다
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import pg from "pg";
import { mkdirSync, writeFileSync } from "fs";

import { EXTRA_LEAVES as NEW_LEAVES, reclassifyLeaf } from "../src/lib/catalog/reclassify-rules.ts";

const RENAMES = { "cj-bikini-sets": "수영복·비치웨어", "cj-chargers": "충전기·어댑터", "cj-boys-bags": "백팩·가방", "cj-mens-clothing": "남성 의류" };
// 부서 이동 (leaf 자체의 parent 변경)
const LEAF_PARENT = { "cj-boys-bags": "fashion" };

const target = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "local";
const apply = process.argv.includes("--apply");
const url = target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL;
const c = new pg.Client({ connectionString: url, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await c.connect();

const catId = async (slug) => (await c.query("select id::int from categories where slug=$1", [slug])).rows[0]?.id;

if (apply) {
  await c.query("begin");
  for (const l of NEW_LEAVES) {
    const parent = await catId(l.dept);
    await c.query(`insert into categories (slug,name,sort,parent_id) values ($1,$2,900,$3) on conflict (slug) do update set name=excluded.name, parent_id=excluded.parent_id`, [l.slug, l.name, parent]);
  }
  for (const [slug, name] of Object.entries(RENAMES)) await c.query("update categories set name=$1 where slug=$2", [name, slug]);
  for (const [slug, dept] of Object.entries(LEAF_PARENT)) await c.query("update categories set parent_id=$1 where slug=$2", [await catId(dept), slug]);
}

const rows = (await c.query(`select pr.id::int id, pr.slug, pr.name, cat.slug leaf from products pr join categories cat on cat.id=pr.category_id where pr.deleted_at is null`)).rows;
const moves = [];
for (const r of rows) {
  const to = reclassifyLeaf(r.name, r.leaf);
  if (to) moves.push({ ...r, to });
}
const agg = {};
for (const m of moves) (agg[`${m.leaf} -> ${m.to}`] ??= []).push(m.name.slice(0, 60));
for (const [k, v] of Object.entries(agg)) console.log(`\n${k} (${v.length})\n  ` + v.slice(0, 6).join("\n  "));
console.log(`\n${target}: ${moves.length} moves of ${rows.length} products${apply ? " APPLIED" : " (dry-run)"}`);

if (apply) {
  mkdirSync("tmp/backup", { recursive: true });
  writeFileSync(`tmp/backup/reclassify-${target}-${Date.now()}.json`, JSON.stringify(moves.map((m) => ({ slug: m.slug, from: m.leaf, to: m.to }))));
  for (const m of moves) {
    const id = await catId(m.to);
    if (!id) { console.log("missing leaf", m.to); continue; }
    await c.query("update products set category_id=$1 where id=$2", [id, m.id]);
  }
  await c.query("commit");
}
await c.end();
