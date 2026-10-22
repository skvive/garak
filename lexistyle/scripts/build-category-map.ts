/**
 * CJ 카테고리(leaf) → LEXI 쇼핑몰 카테고리 이식 + 상품 연동 원장 생성.
 *
 * catalog_index 실데이터(카테고리별 상품 수)를 기준으로 category_cj_leaves 테이블을
 * 채우고, 사용된 LEXI 버킷 categories 행을 보장한다.
 *
 * 사용:
 *   npm run db:build:category-map          # 로컬 PostgreSQL(.env.local DATABASE_URL)
 *   npm run db:build:category-map -- --neon  # NEON_DATABASE_URL
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import pg from "pg";
import {
  bucketForCjChip,
  departmentOfCategorySlug,
  mapCategorySlug,
  CATEGORY_NAMES,
} from "../src/lib/catalog/lexi-cj-categories";
import { koForCjLeaf } from "../src/lib/catalog/cj-leaf-ko";

/** 수기 보정 — 자동 규칙이 놓치는 leaf (HQ Import 스코프는 건드리지 않음) */
const LEAF_OVERRIDES: Record<string, string> = {
  "Boys Bags": "kids",
  "Girls Bags": "kids",
  "Backpacks & Carriers": "kids",
  Boxers: "underwear",
  "Long Johns": "underwear",
  Briefs: "underwear",
  Intimates: "underwear",
  Robes: "women",
  "3D Pens": "tech",
  Batteries: "tech",
  Printers: "tech",
  "Printer Supplies": "tech",
  "Screen Protectors": "tech",
  "Human Hair Wigs": "haircare",
  "Massage & Relaxation": "skincare",
  "Health Care Products": "skincare",
  "Party Masks": "etc",
  "Stickers & Decals": "etc",
  "Wedding & Engagement": "accessories",
  Comforters: "home",
  "Floor Mats": "home",
  Briefcases: "bags",
  Stationeries: "etc",
  "Power Tools": "etc",
  "Exterior Parts": "etc",
  "Other Maintenance Products": "etc",
  "Other Replacement Parts": "etc",
  Lenses: "tech",
  Scanners: "tech",
  "Cleaning Appliances": "home",
  "Flashlights & Torches": "home",
  Floodlights: "home",
  Downlights: "home",
  Bakeware: "home",
  Barware: "home",
  "Fitness & Bodybuilding": "etc",
  "Audio Amplifiers": "tech",
  "Personal Care Appliances": "tech",
  "Tool Sets": "etc",
  "Hand Tools": "etc",
  "Diagnostic Tools": "etc",
  "Inflatable Raft": "etc",
  "Rod Combos": "etc",
  "Diamond Painting Cross Stitch": "etc",
  "Cover-Ups": "women",
  Projectors: "tech",
  "Jump Starter": "etc",
  "Spark Plugs & Ignition System": "etc",
  "Photo Studio": "etc",
  "Interior Parts": "etc",
  "Wool & Blends": "outer",
  "Activity & Gear": "etc",
  Berets: "accessories",
  "Cosplay Wigs": "haircare",
  "Flip Cases": "tech",
};

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS category_cj_leaves (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cj_leaf text NOT NULL UNIQUE,
  bucket_slug text NOT NULL,
  department text NOT NULL,
  label_ko text,
  sort integer NOT NULL DEFAULT 0,
  product_count integer NOT NULL DEFAULT 0,
  mapped_by text NOT NULL DEFAULT 'auto',
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

type LeafRow = { leaf: string; n: number };

function mapLeaf(leaf: string): { bucketSlug: string; mappedBy: "curated" | "override" | "auto" } {
  const override = LEAF_OVERRIDES[leaf];
  if (override) return { bucketSlug: override, mappedBy: "override" };
  const curated = bucketForCjChip(leaf);
  if (curated) return { bucketSlug: curated.key, mappedBy: "curated" };
  return { bucketSlug: mapCategorySlug([leaf]), mappedBy: "auto" };
}

async function main() {
  const useNeon = process.argv.slice(2).includes("--neon");
  const url = useNeon
    ? process.env.NEON_DATABASE_URL?.trim()
    : process.env.DATABASE_URL?.trim() || process.env.NEON_DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL / NEON_DATABASE_URL is not set");

  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  console.log(`=== build-category-map (${useNeon ? "neon" : "local"}) ===`);
  await client.query(CREATE_TABLE_SQL);

  const { rows } = await client.query<LeafRow>(
    `select (category_path)[1] as leaf, count(*)::int as n
       from catalog_index
      where supplier_code = 'cjdropshipping' and source_status <> 'gone'
        and (category_path)[1] is not null
      group by 1 order by 2 desc, 1`,
  );
  console.log("catalog leaves:", rows.length, "items:", rows.reduce((a, r) => a + r.n, 0));

  let sort = 100;
  const usedBuckets = new Set<string>();
  const byDept = new Map<string, number>();
  const byMapped = new Map<string, number>();
  const unmapped: string[] = [];

  await client.query("BEGIN");
  try {
    for (const r of rows) {
      const { bucketSlug, mappedBy } = mapLeaf(r.leaf);
      const department = departmentOfCategorySlug(bucketSlug);
      usedBuckets.add(bucketSlug);
      byDept.set(department, (byDept.get(department) ?? 0) + 1);
      byMapped.set(mappedBy, (byMapped.get(mappedBy) ?? 0) + 1);
      if (bucketSlug === "unmapped") unmapped.push(r.leaf);
      await client.query(
        `INSERT INTO category_cj_leaves
           (cj_leaf, bucket_slug, department, label_ko, sort, product_count, mapped_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now())
         ON CONFLICT (cj_leaf) DO UPDATE SET
           bucket_slug = EXCLUDED.bucket_slug,
           department = EXCLUDED.department,
           label_ko = EXCLUDED.label_ko,
           sort = EXCLUDED.sort,
           product_count = EXCLUDED.product_count,
           mapped_by = EXCLUDED.mapped_by,
           updated_at = now()`,
        [r.leaf, bucketSlug, department, koForCjLeaf(r.leaf), sort++, r.n, mappedBy],
      );
    }

    // 사라진 leaf 정리
    const pruned = await client.query(
      `DELETE FROM category_cj_leaves WHERE cj_leaf <> ALL($1::text[])`,
      [rows.map((r) => r.leaf)],
    );

    // 사용된 버킷 categories 행 보장 (부서 parent 연결)
    const { rows: deptRows } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM categories WHERE slug = ANY($1::text[])`,
      [[...byDept.keys()]],
    );
    const deptId = new Map(deptRows.map((r) => [r.slug, r.id]));
    let bucketSort = 100;
    for (const slug of usedBuckets) {
      const dept = departmentOfCategorySlug(slug);
      await client.query(
        `INSERT INTO categories (slug, name, sort, parent_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
        [slug, CATEGORY_NAMES[slug] ?? slug, bucketSort++, deptId.get(dept) ?? null],
      );
    }
    await client.query("COMMIT");

    console.log("upserted leaves:", rows.length, "| pruned:", pruned.rowCount);
    console.log("mappedBy:", JSON.stringify(Object.fromEntries(byMapped)));
    console.log("departments:", JSON.stringify(Object.fromEntries(byDept)));
    console.log("buckets:", [...usedBuckets].sort().join(", "));
    if (unmapped.length) {
      console.log(`unmapped (${unmapped.length}):`, unmapped.slice(0, 12).join(" / "), unmapped.length > 12 ? "…" : "");
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
