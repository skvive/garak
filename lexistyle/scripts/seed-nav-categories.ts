/**
 * 스토어프론트 GNB + LEXI CJ 버킷 → categories 테이블 통일
 * beauty / fashion / life / kids + 하위 버킷(makeup, women, home, …)
 *
 * 사용:
 *   npm run db:seed:nav-categories              # local + neon
 *   npm run db:seed:nav-categories -- --local   # local only
 *   npm run db:seed:nav-categories -- --neon    # neon only
 *   npm run db:seed:nav-categories -- --dry-run
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import pg from "pg";
import {
  LEXI_CJ_BUCKETS,
  departmentOfCategorySlug,
  mapCategorySlug,
} from "../src/lib/catalog/lexi-cj-categories";

const NAV_CATEGORIES = [
  { slug: "beauty", name: "뷰티", sort: 1 },
  { slug: "fashion", name: "패션", sort: 2 },
  { slug: "life", name: "리빙", sort: 3 },
  { slug: "kids", name: "키즈", sort: 4 },
  { slug: "others", name: "기타", sort: 5 },
  { slug: "brands", name: "Brands", sort: 6 },
  { slug: "trend", name: "Trend", sort: 7 },
  { slug: "best", name: "Best", sort: 8 },
  { slug: "sale", name: "Sale", sort: 9 },
  { slug: "looks", name: "Look", sort: 10 },
] as const;

const NAV_ONLY = new Set(["brands", "trend", "best", "sale", "looks"]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const localOnly = args.includes("--local");
const neonOnly = args.includes("--neon");

const LOCAL =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://lexi:lexi@127.0.0.1:5432/lexi";
const NEON =
  process.env.NEON_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_NEON?.trim() ||
  "";

async function seedOne(url: string, label: string) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  console.log(`\n=== ${label} ===`);

  try {
    for (const c of NAV_CATEGORIES) {
      if (dryRun) {
        console.log(`  [dry] upsert nav ${c.slug}`);
        continue;
      }
      await client.query(
        `INSERT INTO categories (slug, name, sort, parent_id)
         VALUES ($1, $2, $3, NULL)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort`,
        [c.slug, c.name, c.sort],
      );
    }

    const { rows: navRows } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM categories WHERE slug = ANY($1::text[])`,
      [NAV_CATEGORIES.map((c) => c.slug)],
    );
    const catId = new Map(navRows.map((r) => [r.slug, r.id]));

    let sort = 100;
    for (const b of LEXI_CJ_BUCKETS) {
      // kids — 부서 slug와 버킷 key 동일 → nav row 재사용
      if (b.key === b.department) continue;
      const parentId = catId.get(b.department) ?? null;
      if (dryRun) {
        console.log(`  [dry] upsert bucket ${b.key} (${b.label}) parent=${b.department}`);
        continue;
      }
      await client.query(
        `INSERT INTO categories (slug, name, sort, parent_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name, sort = EXCLUDED.sort, parent_id = EXCLUDED.parent_id`,
        [b.key, b.label, sort++, parentId],
      );
    }

    const allSlugs = [
      ...NAV_CATEGORIES.map((c) => c.slug),
      ...LEXI_CJ_BUCKETS.map((b) => b.key),
    ];
    const { rows: allCats } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM categories WHERE slug = ANY($1::text[])`,
      [allSlugs],
    );
    const allCatId = new Map(allCats.map((r) => [r.slug, r.id]));

    const { rows: products } = await client.query<{
      id: number;
      category_id: number;
      category_path: string[] | null;
      cat_slug: string | null;
    }>(
      `SELECT p.id, p.category_id, ci.category_path, c.slug AS cat_slug
       FROM products p
       LEFT JOIN catalog_index ci ON ci.product_id = p.id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_dummy = false`,
    );

    let remapped = 0;
    for (const p of products) {
      let bucketSlug: string;
      if (p.category_path?.length) {
        bucketSlug = mapCategorySlug(p.category_path);
      } else if (p.cat_slug && departmentOfCategorySlug(p.cat_slug) !== "sourced") {
        bucketSlug = p.cat_slug;
      } else {
        bucketSlug = "women";
      }
      const targetId = allCatId.get(bucketSlug) ?? allCatId.get(departmentOfCategorySlug(bucketSlug));
      if (!targetId || p.category_id === targetId) continue;
      if (!dryRun) {
        await client.query(`UPDATE products SET category_id = $1 WHERE id = $2`, [
          targetId,
          p.id,
        ]);
      }
      remapped++;
    }

    const keepSlugs = new Set(allSlugs);
    const { rows: orphans } = await client.query<{ id: number; slug: string; n: number }>(
      `SELECT c.id, c.slug, count(p.id)::int AS n
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       WHERE NOT (c.slug = ANY($1::text[]))
       GROUP BY c.id, c.slug`,
      [[...keepSlugs]],
    );
    for (const row of orphans) {
      if (row.n > 0) {
        console.log(`  skip delete "${row.slug}" — ${row.n} products still linked`);
        continue;
      }
      if (!dryRun) {
        await client.query(`DELETE FROM categories WHERE id = $1`, [row.id]);
      }
      console.log(`  removed legacy category: ${row.slug}`);
    }

    const { rows: summary } = await client.query<{ slug: string; name: string; cnt: number }>(
      `SELECT c.slug, c.name, count(p.id)::int AS cnt
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_dummy = false
       WHERE c.slug = ANY($1::text[])
       GROUP BY c.id, c.slug, c.name
       ORDER BY c.sort, c.id`,
      [[...keepSlugs]],
    );

    console.log(`  remapped products → bucket: ${remapped}`);
    console.log("  categories (with products):");
    for (const r of summary) {
      if (NAV_ONLY.has(r.slug) && r.cnt === 0) continue;
      console.log(`    ${r.slug.padEnd(14)} ${r.name.padEnd(10)} products=${r.cnt}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const targets: { url: string; label: string }[] = [];
  if (!neonOnly) targets.push({ url: LOCAL, label: "local" });
  if (!localOnly && NEON) targets.push({ url: NEON, label: "neon" });
  if (!targets.length) {
    console.error("No DATABASE_URL / NEON_DATABASE_URL configured");
    process.exit(1);
  }
  if (dryRun) console.log("[dry-run mode]");
  for (const t of targets) {
    await seedOne(t.url, t.label);
  }
  console.log("\ndone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
