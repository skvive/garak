/**
 * 카테고리 트리(DB 정본) — 상위 부서 아래 CJ leaf 하위 카테고리와 실제 진열 상품 수.
 * categories(parent_id) + products.category_id 만 읽는다. 60초 메모리 캐시.
 */
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { DEPT_META, isDeptSlug, type LexiDeptSlug } from "@/lib/catalog/cj-taxonomy";

export type SubCategory = { slug: string; name: string; count: number };
export type DeptNode = { slug: LexiDeptSlug; label: string; en: string; total: number; children: SubCategory[] };

const TTL_MS = 60_000;
let cache: { at: number; tree: DeptNode[] } | null = null;

type Row = { dept: string; slug: string; name: string; n: number };

async function loadTree(): Promise<DeptNode[]> {
  const res = await db().execute(sql`
    select top.slug as dept, c.slug as slug, c.name as name,
           count(p.id) filter (where p.deleted_at is null and p.is_dummy = false)::int as n
    from categories c
    join categories top on top.id = c.parent_id
    left join products p on p.category_id = c.id
    where c.slug like 'cj-%'
    group by top.slug, c.slug, c.name, c.sort
    order by n desc, c.sort, c.slug`);
  const rows = res.rows as unknown as Row[];
  return DEPT_META.map((d) => {
    const children = rows
      .filter((r) => r.dept === d.slug && r.n > 0)
      .map((r) => ({ slug: r.slug, name: r.name, count: Number(r.n) }));
    return { slug: d.slug, label: d.label, en: d.en, total: children.reduce((a, c) => a + c.count, 0), children };
  });
}

export async function getCategoryTree(): Promise<DeptNode[]> {
  if (!hasDb()) return DEPT_META.map((d) => ({ slug: d.slug, label: d.label, en: d.en, total: 0, children: [] }));
  if (cache && Date.now() - cache.at < TTL_MS) return cache.tree;
  try {
    const tree = await loadTree();
    cache = { at: Date.now(), tree };
    return tree;
  } catch {
    return cache?.tree ?? DEPT_META.map((d) => ({ slug: d.slug, label: d.label, en: d.en, total: 0, children: [] }));
  }
}

/** 부서 slug → [부서 자신, 소속 CJ leaf 카테고리 slug...] (상품 조회용) */
export async function categorySlugsForDept(dept: string): Promise<string[]> {
  if (!isDeptSlug(dept)) return [dept];
  const tree = await getCategoryTree();
  const node = tree.find((d) => d.slug === dept);
  return [dept, ...(node?.children.map((c) => c.slug) ?? [])];
}

/** 부서 페이지 하위칩 — 상품이 있는 CJ leaf 카테고리만 */
export async function subcategoriesForDept(dept: string): Promise<SubCategory[]> {
  const tree = await getCategoryTree();
  return tree.find((d) => d.slug === dept)?.children ?? [];
}
