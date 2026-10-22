/**
 * 카테고리 재구성: 상위(부서)는 유지·신규 3개 추가, 하위는 CJ leaf 카테고리로 교체하고
 * 모든 상품의 category_id 를 해당 CJ leaf 카테고리로 재배치한다.
 * 모든 조회·갱신을 slug 기준으로 해서 로컬/Neon 의 id 불일치와 무관하게 동작한다(idempotent).
 *
 *   node scripts/restructure-categories.mjs --target=local [--dry-run]
 *   node scripts/restructure-categories.mjs --target=neon  [--dry-run]
 *
 * 입력: tmp/product-leaf.json (상품 slug → CJ leaf, scripts/_cat-analyze2.ts 산출), tmp/extra-leaf.json
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import pg from "pg";

const args = process.argv.slice(2);
const target = (args.find((a) => a.startsWith("--target="))?.split("=")[1]) ?? "local";
const dry = args.includes("--dry-run");
const url = target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL;
if (!url) throw new Error(`no connection string for ${target}`);
if (target === "local" && !/127\.0\.0\.1|localhost/.test(url)) throw new Error("DATABASE_URL is not local");

const leafMap = JSON.parse(readFileSync("src/lib/catalog/cj-leaf-map.json", "utf-8"));
const DEPTS = [
  { slug: "beauty", name: "뷰티", sort: 1 }, { slug: "fashion", name: "패션", sort: 2 }, { slug: "life", name: "리빙", sort: 3 },
  { slug: "kids", name: "키즈", sort: 4 }, { slug: "others", name: "기타", sort: 5 },
  { slug: "sports", name: "스포츠·아웃도어", sort: 11 }, { slug: "digital", name: "디지털·가전", sort: 12 }, { slug: "auto", name: "자동차·바이크", sort: 13 },
];
const NEW_DEPTS = new Set(["sports", "digital", "auto"]);
const MANUAL = {
  "solid-turtleneck-long-sweater-winter-warm-women-sweater-dress-bb3f2d46": "Lady Dresses",
};
const FALLBACK_DEPT_CAT = { "lexi-pdp-681": "others" };

const rows = JSON.parse(readFileSync("tmp/product-leaf.json", "utf-8"));
const extra = JSON.parse(readFileSync("tmp/extra-leaf.json", "utf-8"));
const slugLeaf = new Map();
for (const r of rows) if (r.leaf) slugLeaf.set(r.slug, r.leaf);
for (const [s, l] of Object.entries(extra)) slugLeaf.set(s, l);
for (const [s, l] of Object.entries(MANUAL)) slugLeaf.set(s, l);

const client = new pg.Client({ connectionString: url, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await client.connect();
console.log(`target=${target} dry=${dry}`);

// 0) 백업
mkdirSync("tmp/backup", { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const bk = {
  categories: (await client.query("select id::int, slug, name, parent_id::int, sort from categories order by id")).rows,
  products: (await client.query("select id::int, slug, category_id::int from products")).rows,
  leaves: await client.query("select * from category_cj_leaves").then((r) => r.rows).catch(() => []),
};
writeFileSync(`tmp/backup/${target}-${ts}.json`, JSON.stringify(bk));
console.log("backup ->", `tmp/backup/${target}-${ts}.json`, "categories", bk.categories.length, "products", bk.products.length);

const live = (await client.query("select id::int, slug, category_id::int cid from products where deleted_at is null")).rows;
console.log("live products", live.length);

// 1) 상위 부서
if (!dry) await client.query("begin");
try {
  const deptId = {};
  for (const d of DEPTS) {
    if (dry) { console.log("  [dry] dept", d.slug); continue; }
    if (NEW_DEPTS.has(d.slug)) {
      await client.query(`insert into categories (slug, name, sort, parent_id) values ($1,$2,$3,null)
        on conflict (slug) do update set name = excluded.name, sort = excluded.sort, parent_id = null`, [d.slug, d.name, d.sort]);
    }
    const r = await client.query("select id::int from categories where slug=$1", [d.slug]);
    if (!r.rows[0]) throw new Error(`top-level ${d.slug} missing in ${target}`);
    deptId[d.slug] = r.rows[0].id;
  }

  // 1.5) 로컬 매핑에 없는 상품(대상 DB 에만 있는 것)은 대상 DB 의 catalog_index 에서 pid 로 leaf 보강
  const missing = live.filter((p) => !slugLeaf.has(p.slug));
  const pidOf = (slug) => slug.match(/(\d{15,25})$/)?.[1];
  const pids = missing.map((p) => pidOf(p.slug)).filter(Boolean);
  if (pids.length) {
    const r = await client.query(
      "select external_id, category_path[1] as leaf from catalog_index where supplier_code='cjdropshipping' and external_id = any($1::text[])",
      [pids],
    );
    const byPid = new Map(r.rows.map((x) => [x.external_id, x.leaf]));
    for (const p of missing) {
      const leaf = byPid.get(pidOf(p.slug));
      if (leaf && leafMap[leaf]) slugLeaf.set(p.slug, leaf);
    }
  }

  // 2) 상품이 실제로 있는 leaf 만 하위 카테고리 생성
  const needed = new Map(); // leaf -> count
  const unresolved = [];
  for (const p of live) {
    const leaf = slugLeaf.get(p.slug);
    if (leaf && leafMap[leaf]) needed.set(leaf, (needed.get(leaf) ?? 0) + 1);
    else unresolved.push(p.slug);
  }
  console.log("leaf categories to create/update:", needed.size, "unresolved products:", unresolved.length);
  const sortedLeaves = [...needed.entries()].sort((a, b) => b[1] - a[1]);
  const catId = {};
  let order = 100;
  for (const [leaf, n] of sortedLeaves) {
    const e = leafMap[leaf];
    if (dry) { catId[leaf] = -1; continue; }
    const r = await client.query(
      `insert into categories (slug, name, sort, parent_id) values ($1,$2,$3,$4)
       on conflict (slug) do update set name = excluded.name, sort = excluded.sort, parent_id = excluded.parent_id returning id::int`,
      [e.slug, e.ko, order++, deptId[e.dept]],
    );
    catId[leaf] = r.rows[0].id;
  }

  // 3) 상품 재배치 (slug 기준)
  const byLeaf = new Map();
  for (const p of live) {
    const leaf = slugLeaf.get(p.slug);
    if (!leaf || !catId[leaf]) continue;
    (byLeaf.get(leaf) ?? byLeaf.set(leaf, []).get(leaf)).push(p.slug);
  }
  let moved = 0;
  for (const [leaf, slugs] of byLeaf) {
    if (dry) { moved += slugs.length; continue; }
    const r = await client.query("update products set category_id=$1 where slug = any($2::text[])", [catId[leaf], slugs]);
    moved += r.rowCount ?? 0;
  }
  // 미분류 상품은 기타 부서로(노출 누락 방지)
  let fallback = 0;
  for (const slug of unresolved) {
    const dept = FALLBACK_DEPT_CAT[slug] ?? "others";
    if (dry) { fallback++; continue; }
    const r = await client.query("update products set category_id=$1 where slug=$2", [deptId[dept], slug]);
    fallback += r.rowCount ?? 0;
  }
  console.log("moved", moved, "fallback(others)", fallback);

  // 4) CJ leaf 원장(category_cj_leaves) 도 새 분류로 갱신
  let leavesUpdated = 0;
  if (!dry) {
    for (const [leaf, e] of Object.entries(leafMap)) {
      const r = await client.query(
        "update category_cj_leaves set bucket_slug=$2, department=$3, label_ko=$4 where cj_leaf=$1",
        [leaf, e.slug, e.dept, e.ko],
      ).catch(() => ({ rowCount: 0 }));
      leavesUpdated += r.rowCount ?? 0;
    }
  }
  console.log("category_cj_leaves updated", leavesUpdated);

  if (!dry) await client.query("commit");

  // 5) 검증
  if (!dry) {
    const dang = await client.query(`select count(*)::int n from products p where p.deleted_at is null and not exists (select 1 from categories c where c.id=p.category_id)`);
    const perDept = await client.query(`
      select coalesce(top.slug, c.slug) as dept, count(*)::int n
      from products p join categories c on c.id=p.category_id left join categories top on top.id=c.parent_id
      where p.deleted_at is null group by 1 order by 2 desc`);
    console.log("dangling category_id (must be 0):", dang.rows[0].n);
    console.log("products per top-level:", JSON.stringify(perDept.rows));
  }
} catch (e) {
  if (!dry) await client.query("rollback");
  throw e;
} finally {
  await client.end();
}
