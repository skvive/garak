/**
 * LEXI 카테고리 3단 택소노미
 * L1 GNB = Beauty/Fashion/Life/Kids (+ rails)
 * L2 Dashboard = beauty | fashion | life | kids
 * L3 CJ = CJ_TOP_CATEGORIES 14종 (상품 원장 category slug)
 *
 * 정본: docs/lexi-category-taxonomy.md
 */
import { CJ_TOP_CATEGORIES } from "@/lib/catalog/cj-categories";
import type { CjCategory } from "@/lib/dummy-data";

export const DASHBOARD_DEPTS = ["beauty", "fashion", "life", "kids", "others", "sports", "digital", "auto"] as const;
export type DashboardDept = (typeof DASHBOARD_DEPTS)[number];

/** L2 → L3 배치표 */
export const DEPT_TO_CJ: Record<DashboardDept, readonly CjCategory[]> = {
  beauty: ["beauty"],
  fashion: ["women-clothing", "men-clothing", "bags-shoes", "jewelry"],
  life: ["home-garden", "pet", "home-improve"],
  /** CJ 1단 중 기존 5개 부서에 맞는 곳이 없던 것 → 신규 상위 부서 */
  sports: ["sports"],
  digital: ["electronics", "phones", "computers"],
  auto: ["auto"],
  kids: ["kids"],
  /** CJ 미매핑·기타 — 스토어 Others */
  others: [],
};

const CJ_TO_DEPT: Record<CjCategory, DashboardDept> = (() => {
  const map = {} as Record<CjCategory, DashboardDept>;
  for (const dept of DASHBOARD_DEPTS) {
    for (const cj of DEPT_TO_CJ[dept]) map[cj] = dept;
  }
  return map;
})();

export function isDashboardDept(slug: string): slug is DashboardDept {
  return (DASHBOARD_DEPTS as readonly string[]).includes(slug);
}

/** L2 대시보드 slug → 포함 CJ id 목록 */
export function cjIdsForDept(dept: DashboardDept): readonly CjCategory[] {
  return DEPT_TO_CJ[dept];
}

/** L3 CJ id → L2 대시보드 */
export function deptForCj(cj: CjCategory | string): DashboardDept | null {
  return (CJ_TO_DEPT as Record<string, DashboardDept>)[cj] ?? null;
}

/** listProducts 필터용: L2면 L3 집합, L3면 단일, 아니면 빈 */
export function expandCategoryFilter(category: string): string[] {
  if (isDashboardDept(category)) return [...DEPT_TO_CJ[category]];
  if (CJ_TO_DEPT[category as CjCategory]) return [category];
  return [category];
}

/** 상품이 필터(L2 또는 L3)에 속하는지 */
export function productMatchesCategory(productCategory: string, filterCategory: string): boolean {
  const expanded = expandCategoryFilter(filterCategory);
  return expanded.includes(productCategory);
}

export function cjLabel(id: CjCategory): string {
  return CJ_TOP_CATEGORIES.find((c) => c.id === id)?.ko ?? id;
}

export function cjShortLabel(id: CjCategory): string {
  const map: Partial<Record<CjCategory, string>> = {
    beauty: "뷰티",
    "women-clothing": "여성의류",
    "men-clothing": "남성의류",
    "bags-shoes": "가방·신발",
    jewelry: "주얼리",
    "home-garden": "홈&가든",
    pet: "반려동물",
    sports: "스포츠",
    electronics: "전자제품",
    "home-improve": "공구·DIY",
    auto: "자동차",
    phones: "휴대폰",
    computers: "컴퓨터",
    kids: "키즈",
  };
  return map[id] ?? cjLabel(id);
}

/** CJ L3 → 스토어프론트 products.category(LEXI 버킷 slug) */
export const CJ_TO_BUCKET_SLUGS: Record<CjCategory, readonly string[]> = {
  beauty: ["skincare", "makeup", "haircare", "beauty"],
  "women-clothing": ["women", "outer", "underwear"],
  "men-clothing": ["men"],
  "bags-shoes": ["bags", "shoes"],
  jewelry: ["accessories"],
  "home-garden": ["home"],
  pet: ["pets"],
  sports: ["etc"],
  electronics: ["tech"],
  "home-improve": ["etc", "home"],
  auto: ["etc"],
  phones: ["tech"],
  computers: ["tech"],
  kids: ["kids"],
};

/** 레거시 ?bucket= → CJ L3 */
export const BUCKET_TO_CJ: Record<string, CjCategory> = {
  skincare: "beauty",
  makeup: "beauty",
  haircare: "beauty",
  women: "women-clothing",
  men: "men-clothing",
  outer: "women-clothing",
  bags: "bags-shoes",
  shoes: "bags-shoes",
  accessories: "jewelry",
  underwear: "women-clothing",
  home: "home-garden",
  pets: "pet",
  tech: "electronics",
  etc: "sports",
  kids: "kids",
};

export function isCjCategory(slug: string): slug is CjCategory {
  return (CJ_TOP_CATEGORIES as readonly { id: string }[]).some((c) => c.id === slug);
}

export function bucketSlugsForCj(cj: CjCategory): readonly string[] {
  return CJ_TO_BUCKET_SLUGS[cj] ?? [];
}

/** 상품 category slug가 CJ L3 필터에 매칭되는지 */
export function productMatchesCj(productCategory: string, cj: CjCategory): boolean {
  if (productCategory === cj) return true;
  if (bucketSlugsForCj(cj).includes(productCategory)) return true;
  return productMatchesCategory(productCategory, cj);
}
