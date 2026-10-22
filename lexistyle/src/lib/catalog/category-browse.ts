/**
 * 카테고리 브라우즈 — DB(catalog_index + category_cj_leaves) / 로컬 스토어(categoryBrowse + catalog) 기반.
 * DB(hasDb)가 있으면 CJ 카테고리 이식 원장에서 하위칩을 읽고, 없으면 로컬 JSON을 쓴다.
 */
import { hasDb } from "@/db";
import { subcategoriesForDept } from "@/lib/catalog/category-tree";
import { localStore } from "@/lib/local-store";

export type CategoryLeafDef = { leaf: string; ko: string; count: number };

export type LocalCatalogRow = {
  id: number;
  supplierCode: string;
  externalId: string;
  title: string;
  titleKo?: string | null;
  categoryPath: string[] | null;
  minPrice: string | null;
  maxPrice: string | null;
  currency: string;
  primaryThumbUrl: string | null;
  sellerName: string | null;
  sourceStatus?: string | null;
  rawMeta?: Record<string, unknown> | null;
};

type BrowseStore = { categoryBrowse?: Record<string, CategoryLeafDef[]> };

/** 부서 slug → CJ leaf 정의 목록 (없으면 빈 배열) */
export function leafDefsForDept(dept: string): CategoryLeafDef[] {
  const s = localStore() as BrowseStore;
  return s.categoryBrowse?.[dept] ?? [];
}

/** leaf 이름 → 로컬 catalog 상품 목록 (thumb 있는 것 우선) */
export function productsForLeaf(leaf: string, limit = 60): LocalCatalogRow[] {
  const s = localStore();
  const cat = (s.catalog ?? []) as LocalCatalogRow[];
  const rows = cat.filter(
    (r) =>
      r.supplierCode === "cjdropshipping" &&
      r.categoryPath?.[0] === leaf &&
      r.sourceStatus !== "gone",
  );
  return rows
    .sort((a, b) => {
      const aHas = a.primaryThumbUrl ? 1 : 0;
      const bHas = b.primaryThumbUrl ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return a.id - b.id;
    })
    .slice(0, limit);
}

/** leaf별 실제 로컬 저장 상품 수 (칩 배지용) */
export function leafCount(leaf: string): number {
  const s = localStore();
  const cat = (s.catalog ?? []) as LocalCatalogRow[];
  return cat.filter(
    (r) =>
      r.supplierCode === "cjdropshipping" &&
      r.categoryPath?.[0] === leaf &&
      r.sourceStatus !== "gone",
  ).length;
}

/** 부서 leaf 정의 + 실제 저장 수 병합 (칩 목록) */
export function leafDefsForDeptWithCount(dept: string): CategoryLeafDef[] {
  return leafDefsForDept(dept).map((d) => ({ ...d, count: leafCount(d.leaf) }));
}

/** 부서 전체 상품 (leaf 필터 없음) — 대표 leaf들 상품만 합쳐 보여줌 */
export function productsForDept(dept: string, limit = 80): LocalCatalogRow[] {
  const defs = leafDefsForDept(dept);
  const seen = new Set<number>();
  const out: LocalCatalogRow[] = [];
  for (const def of defs) {
    for (const p of productsForLeaf(def.leaf, 12)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out.slice(0, limit);
}

/* ── DB 모드(로컬 PG/Neon) — category_cj_leaves + catalog_index 라이브 카운트 ── */

/**
 * DB 기반 부서 하위칩 — 부서 아래 CJ leaf 하위 카테고리(categories.parent_id)와 진열 상품 수.
 * leaf 필드에는 하위 카테고리 slug(cj-*)가 들어간다. (bucket 인자는 레거시 호환용으로 무시)
 */
export async function dbLeafDefsForDept(dept: string, _bucket?: string): Promise<CategoryLeafDef[]> {
  if (!hasDb()) return [];
  const subs = await subcategoriesForDept(dept);
  return subs.map((c) => ({ leaf: c.slug, ko: c.name, count: c.count }));
}
