/**
 * 4개 부서(beauty/fashion/life/kids) 카테고리 브라우즈 데이터 로컬 생성
 *  - Neon catalog_index에서 부서별 CJ leaf 상품 조회 → 로컬 catalog upsert
 *  - localStore.categoryBrowse: 부서 → [{ leaf, ko }] 저장
 *
 * 사용: npx tsx scripts/build-category-browse.ts   (Neon 읽기 + 로컬 쓰기)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
delete process.env.DATABASE_URL; // 로컬 JSON 모드 강제 (쓰기는 로컬 스토어로)

import { writeFileSync, readFileSync } from "fs";
import os from "os";
import path from "path";
import pg from "pg";
import { upsertCatalogMeta } from "../src/lib/catalog/index-store";
import { localStore, scheduleLocalPersist } from "../src/lib/local-store";

const NEON = process.env.NEON_DATABASE_URL || "";
const DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");

/** 부서별 CJ 실존 leaf (Neon 296개 leaf 중 검증된 것) */
const DEPT_LEAVES: Record<string, { leaf: string; ko: string }[]> = {
  beauty: [
    { leaf: "Facial Care", ko: "페이셜케어" },
    { leaf: "Face Skin Care Tools", ko: "피부관리도구" },
    { leaf: "Body Care", ko: "바디케어" },
    { leaf: "Nail Art Kits", ko: "네일아트" },
    { leaf: "Human Hair Wigs", ko: "헤어위그" },
    { leaf: "Headband & Hair Band & Hairpin", ko: "헤어액세서리" },
    { leaf: "Massage & Relaxation", ko: "마사지·릴렉스" },
    { leaf: "Health Care Products", ko: "헬스케어" },
  ],
  fashion: [
    { leaf: "Lady Dresses", ko: "원피스" },
    { leaf: "Blouses & Shirts", ko: "블라우스&셔츠" },
    { leaf: "Skirts", ko: "스커트" },
    { leaf: "Wide Leg Pants", ko: "와이드팬츠" },
    { leaf: "Woman Hoodies & Sweatshirts", ko: "후드&스웨트셔츠" },
    { leaf: "Sweaters", ko: "니트·스웨터" },
    { leaf: "Suits & Sets", ko: "수트·셋업" },
    { leaf: "Blazers", ko: "블레이저" },
  ],
  life: [
    { leaf: "Furniture", ko: "가구" },
    { leaf: "Home Office Storage", ko: "수납·정리" },
    { leaf: "Kitchen Storage", ko: "주방수납" },
    { leaf: "Pillows", ko: "베개" },
    { leaf: "Bedding Sets", ko: "침구세트" },
    { leaf: "Kitchen Knives & Accessories", ko: "주방칼·도구" },
    { leaf: "Event & Party Supplies", ko: "파티·이벤트" },
    { leaf: "Pet Shower Products", ko: "반려동물용품" },
  ],
  kids: [
    { leaf: "Action & Toy Figures", ko: "액션피규어" },
    { leaf: "Blocks", ko: "블록" },
    { leaf: "Girl Clothing Sets", ko: "여아의류세트" },
    { leaf: "Boys Bags", ko: "남아가방" },
    { leaf: "Stuffed & Plush Animals", ko: "봉제인형" },
    { leaf: "Girl Dresses", ko: "여아원피스" },
    { leaf: "Baby Clothing Sets", ko: "유아의류세트" },
    { leaf: "RC Helicopters", ko: "RC헬기" },
  ],
};

type NeonRow = {
  id: number;
  external_id: string;
  title: string;
  category_path: string[] | null;
  min_price: string | null;
  primary_thumb_url: string | null;
  seller_name: string | null;
  source_url: string | null;
  raw_meta: Record<string, unknown> | null;
  import_state: string;
};

async function main() {
  if (!NEON) throw new Error("NEON_DATABASE_URL required");
  const client = new pg.Client({ connectionString: NEON });
  await client.connect();

  const browse: Record<string, { leaf: string; ko: string; count: number }[]> = {};
  const leaves = Object.values(DEPT_LEAVES).flatMap((l) => l.map((x) => x.leaf));
  const res = await client.query<NeonRow>(
    `select id, external_id, title, category_path, min_price, primary_thumb_url,
            seller_name, source_url, raw_meta, import_state
       from catalog_index
      where supplier_code = 'cjdropshipping'
        and source_status <> 'gone'
        and (category_path)[1] = any($1::text[])`,
    [leaves],
  );
  const rows = res.rows;
  console.log("Neon 조회:", rows.length, "건");

  // leaf별로 그룹
  const byLeaf = new Map<string, NeonRow[]>();
  for (const r of rows) {
    const leaf = r.category_path?.[0] ?? "?";
    byLeaf.set(leaf, [...(byLeaf.get(leaf) ?? []), r]);
  }

  let upserted = 0;
  for (const [dept, defs] of Object.entries(DEPT_LEAVES)) {
    const out: { leaf: string; ko: string; count: number }[] = [];
    for (const def of defs) {
      const items = byLeaf.get(def.leaf) ?? [];
      out.push({ leaf: def.leaf, ko: def.ko, count: items.length });
      for (const r of items) {
        await upsertCatalogMeta({
          supplierCode: "cjdropshipping",
          externalId: String(r.external_id ?? r.id),
          title: r.title ?? "Untitled",
          categoryPath: r.category_path ?? [],
          price: Number(r.min_price ?? 0),
          currency: "USD",
          stock: 10,
          primaryThumbUrl: r.primary_thumb_url ?? null,
          sellerName: r.seller_name ?? null,
          sourceUrl: r.source_url ?? null,
          rawMeta: r.raw_meta ?? null,
        });
        upserted++;
      }
    }
    browse[dept] = out;
    console.log(`  ${dept}: ${out.map((o) => `${o.ko}(${o.count})`).join(", ")}`);
  }

  // localStore 저장
  const ls = localStore();
  (ls as Record<string, unknown>).categoryBrowse = browse;
  scheduleLocalPersist();
  await new Promise((res) => setTimeout(res, 500));
  writeFileSync(STORE_PATH, JSON.stringify(ls, null, 2), "utf8");
  await client.end();
  console.log(`\n완료: ${upserted}건 로컬 upsert, categoryBrowse 저장 → ${STORE_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});