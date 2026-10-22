/**
 * LEXI 카테고리 택소노미 — 상위 부서(대분류) 아래에 CJ 공식 카테고리(leaf)를 하위 카테고리로 둔다.
 * - 상위: 기존 beauty/fashion/life/kids/others 유지 + CJ 1단 중 맞는 곳이 없던 sports/digital/auto 신규
 * - 하위: CJ leaf 1개 = categories 행 1개 (slug = cj-<leaf>), products.category_id 가 이 하위 행을 가리킨다
 * 데이터 정본: cj-leaf-map.json (CJ getCategory 트리 기준으로 scripts/_cat-*.ts 가 생성)
 */
import leafMap from "./cj-leaf-map.json";

export type LexiDeptSlug = "beauty" | "fashion" | "life" | "kids" | "others" | "sports" | "digital" | "auto";

export type DeptMeta = { slug: LexiDeptSlug; label: string; en: string; sort: number; isNew: boolean };

/** 화면 노출 순서 */
export const DEPT_META: DeptMeta[] = [
  { slug: "beauty", label: "뷰티", en: "Beauty", sort: 1, isNew: false },
  { slug: "fashion", label: "패션", en: "Fashion", sort: 2, isNew: false },
  { slug: "life", label: "리빙", en: "Life", sort: 3, isNew: false },
  { slug: "kids", label: "키즈", en: "Kids", sort: 4, isNew: false },
  { slug: "sports", label: "스포츠·아웃도어", en: "Sports & Outdoors", sort: 11, isNew: true },
  { slug: "digital", label: "디지털·가전", en: "Digital & Electronics", sort: 12, isNew: true },
  { slug: "auto", label: "자동차·바이크", en: "Auto & Moto", sort: 13, isNew: true },
  { slug: "others", label: "기타", en: "Others", sort: 5, isNew: false },
];

export const DEPT_SLUGS: readonly LexiDeptSlug[] = DEPT_META.map((d) => d.slug);

export type CjLeafEntry = { slug: string; ko: string; dept: LexiDeptSlug; first: string; second: string };
const LEAVES = leafMap as Record<string, CjLeafEntry>;

export function isDeptSlug(s: string): s is LexiDeptSlug {
  return (DEPT_SLUGS as readonly string[]).includes(s);
}

/** "Lady Dresses" → cj-lady-dresses (leaf 이름 → 카테고리 slug, 결정적) */
export function cjLeafSlug(leaf: string): string {
  return (
    "cj-" +
    leaf
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/'/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export function cjLeafEntry(leaf: string | null | undefined): CjLeafEntry | null {
  if (!leaf) return null;
  // CJ has released spelling variants for the same leaf over time.
  // Normalize only known aliases so historical imports resolve to one category row.
  const aliases: Record<string, string> = {
    "Women Trench Coat": "Woman Trench",
  };
  return LEAVES[leaf] ?? LEAVES[aliases[leaf]] ?? null;
}

/** 미등록 leaf 폴백: CJ 1단 이름으로 부서만 추정 */
const FIRST_TO_DEPT: Record<string, LexiDeptSlug> = {
  "Women's Clothing": "fashion",
  "Men's Clothing": "fashion",
  "Bags & Shoes": "fashion",
  "Jewelry & Watches": "fashion",
  "Health, Beauty & Hair": "beauty",
  "Home, Garden & Furniture": "life",
  "Home Improvement": "life",
  "Pet Supplies": "life",
  "Toys, Kids & Babies": "kids",
  "Sports & Outdoors": "sports",
  "Consumer Electronics": "digital",
  "Phones & Accessories": "digital",
  "Computer & Office": "digital",
  "Automobiles & Motorcycles": "auto",
};

/** CJ categoryPath(["Women's Clothing","Tops & Sets","Lady Dresses"] 또는 leaf 1개) → 하위 카테고리 정의 */
export function resolveCjCategory(
  path: string[] | null | undefined,
): { slug: string; name: string; dept: LexiDeptSlug; leaf: string } | null {
  if (!path?.length) return null;
  const leaf = path[path.length - 1].trim();
  const known = cjLeafEntry(leaf);
  if (known) return { slug: known.slug, name: known.ko, dept: known.dept, leaf };
  const dept = path.length > 1 ? FIRST_TO_DEPT[path[0]?.trim() ?? ""] : undefined;
  if (!dept) return null;
  return { slug: cjLeafSlug(leaf), name: leaf, dept, leaf };
}

export const CJ_LEAF_SLUG_PREFIX = "cj-";

const SLUG_TO_ENTRY = new Map<string, CjLeafEntry & { leaf: string }>(
  Object.entries(LEAVES).map(([leaf, e]) => [e.slug, { ...e, leaf }]),
);

/** products.category(slug) → 상위 부서. 부서 slug 자신/CJ leaf slug/레거시 버킷 모두 처리 */
export function deptOfCategorySlug(slug: string | null | undefined): LexiDeptSlug {
  if (!slug) return "others";
  if (isDeptSlug(slug)) return slug;
  const hit = SLUG_TO_ENTRY.get(slug);
  if (hit) return hit.dept;
  return "others";
}

export function cjLeafBySlug(slug: string): (CjLeafEntry & { leaf: string }) | null {
  return SLUG_TO_ENTRY.get(slug) ?? null;
}
