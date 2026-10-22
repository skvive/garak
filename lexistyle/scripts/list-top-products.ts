/**
 * CJ 카탈로그 → 카테고리별 상위 판매량 리스트
 * JSON 로컬 스토어 사용
 * npx tsx scripts/list-top-products.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { LEXI_CJ_BUCKETS, bucketByKey, mapCategorySlug, activeImportCjChips } from "../src/lib/catalog/lexi-cj-categories";
import { localStore } from "../src/lib/local-store";

type CatalogRow = {
  id: number;
  externalId: string;
  title: string;
  titleKo?: string;
  supplierCode: string;
  categoryPath: string[] | null;
  minPrice: number | string | null;
  maxPrice: number | string | null;
  currency: string;
  stock: number;
  primaryThumbUrl: string | null;
  sellerName: string | null;
  sourceUrl: string | null;
  importState: string;
  rawMeta: Record<string, unknown> | null;
  sourceStatus: string;
};

function getListedNum(r: CatalogRow): number {
  if (r.rawMeta && typeof r.rawMeta === "object") {
    const v = (r.rawMeta as Record<string, unknown>).listedNum;
    if (v != null) return Number(v);
  }
  return 0;
}

function main() {
  const ls = localStore();
  const cat = (ls.catalog ?? []) as CatalogRow[];

  const cjActive = cat.filter((r) => r.supplierCode === "cjdropshipping" && r.sourceStatus !== "gone");
  console.log(`총 CJ 카탈로그: ${cjActive.length}`);
  const stateMap = new Map<string, number>();
  for (const r of cjActive) {
    const s = r.importState || "none";
    stateMap.set(s, (stateMap.get(s) ?? 0) + 1);
  }
  for (const [k, v] of [...stateMap.entries()].sort()) console.log(`  importState ${k}: ${v}`);

  let withListed = 0;
  for (const r of cjActive) { if (getListedNum(r) > 0) withListed++; }
  console.log(`\nlistedNum(판매량) 있음: ${withListed}, 없음: ${cjActive.length - withListed} (크롤에 listedNum 저장 추가 후 반영됨)`);

  const activeChips = new Set(activeImportCjChips());
  const bucketMap = new Map<string, CatalogRow[]>();

  for (const r of cjActive) {
    const leaf = r.categoryPath?.[0];
    if (!leaf || !activeChips.has(leaf)) continue;
    const bucket = bucketByKey(mapCategorySlug(r.categoryPath));
    if (!bucket || !bucket.activeImport) continue;
    const arr = bucketMap.get(bucket.key) ?? [];
    arr.push(r);
    bucketMap.set(bucket.key, arr);
  }

  for (const bucket of LEXI_CJ_BUCKETS) {
    if (!bucket.activeImport) continue;
    const all = bucketMap.get(bucket.key) ?? [];
    const ranked = [...all].sort((a, b) => getListedNum(b) - getListedNum(a)).slice(0, 20);
    const imported = all.filter((r) => r.importState === "imported").length;

    console.log(`\n\n## ${bucket.label} (${bucket.key})`);
    console.log(`전체 ${all.length}개 중 상위 20 (imported ${imported}개)`);
    if (ranked.length === 0) { console.log("(해당 카테고리 상품 없음)"); continue; }
    console.log("| # | 상품명 | CJ leaf | 가격(USD) | listedNum | Import | 셀러 |");
    console.log("|---|--------|---------|----------|-----------|--------|------|");
    ranked.forEach((r, i) => {
      const leaf = r.categoryPath?.[0] ?? "-";
      const price = r.minPrice != null ? `$${Number(r.minPrice).toFixed(2)}` : "-";
      const listed = getListedNum(r);
      const imp = r.importState === "imported" ? "✅" : "⬜";
      console.log(`| ${String(i + 1).padStart(2)} | ${(r.title || "").slice(0, 44).padEnd(44)} | ${(leaf || "").padEnd(24)} | ${(price || "").padEnd(8)} | ${String(listed || "-").padStart(6)} | ${imp} | ${(r.sellerName || "-").slice(0, 16).padEnd(16)} |`);
    });
  }

  // Orphan leaf report
  const mappedChips = new Set<string>();
  for (const b of LEXI_CJ_BUCKETS) for (const chip of b.cjChips) mappedChips.add(chip);
  const orphanMap = new Map<string, number>();
  for (const r of cjActive) {
    const leaf = r.categoryPath?.[0];
    const sexPrefix = /^(Men's|Women's|Man |Woman )/.test(leaf || "");
    if (leaf && !mappedChips.has(leaf) && !sexPrefix) {
      orphanMap.set(leaf, (orphanMap.get(leaf) ?? 0) + 1);
    }
  }
  if (orphanMap.size > 0) {
    console.log("\n\n## ⚠️ 미매핑 CJ leaf (5건 이상, 취급 검토 대상)");
    console.log("| CJ leaf | 개수 |");
    console.log("|---------|------|");
    for (const [leaf, count] of [...orphanMap.entries()].filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1])) {
      console.log(`| ${leaf} | ${count} |`);
    }
  }
}

main();