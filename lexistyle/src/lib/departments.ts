/**
 * 부서 택소노미 — 스토어 부서 ↔ LEXI CJ 버킷 매핑 (카탈로그 매칭 보고서 정본).
 */
import type { IconKey } from "@/components/commerce/rails";
import {
  type DashboardDept,
  DEPT_TO_CJ,
  isDashboardDept,
} from "@/lib/catalog/category-taxonomy";
import {
  storefrontBucketsForDepartment,
  type LexiDept,
} from "@/lib/catalog/lexi-cj-categories";
import { deptOfCategorySlug } from "@/lib/catalog/cj-taxonomy";

export type DepartmentSub = {
  label: string;
  icon: IconKey;
  bucket: string;
};

export type Department = {
  slug: DashboardDept;
  label: string;
  en: string;
  /** L3 CJ ids (레거시·HQ 참조) */
  cjCategories: readonly import("@/lib/dummy-data").CjCategory[];
  subcategories: DepartmentSub[];
};

const BUCKET_ICONS: Record<string, IconKey> = {
  skincare: "skincare",
  makeup: "makeup",
  haircare: "skincare",
  women: "fashion",
  men: "fashion",
  outer: "fashion",
  bags: "bag",
  shoes: "shoes",
  accessories: "jewelry",
  underwear: "fashion",
  home: "home",
  etc: "gift",
  tech: "tech",
  pets: "pet",
  kids: "kids",
  unmapped: "gift",
};

function subsFor(dept: LexiDept): DepartmentSub[] {
  return storefrontBucketsForDepartment(dept).map((b) => ({
    label: b.label,
    icon: BUCKET_ICONS[b.key] ?? "gift",
    bucket: b.key,
  }));
}

export const departments: Department[] = [
  {
    slug: "beauty",
    label: "수산",
    en: "Seafood",
    cjCategories: DEPT_TO_CJ.beauty,
    subcategories: subsFor("beauty"),
  },
  {
    slug: "fashion",
    label: "한 상",
    en: "Hansang Sets",
    cjCategories: DEPT_TO_CJ.fashion,
    subcategories: subsFor("fashion"),
  },
  {
    slug: "life",
    label: "축산",
    en: "Meat",
    cjCategories: DEPT_TO_CJ.life,
    subcategories: subsFor("life"),
  },
  {
    slug: "kids",
    label: "청과",
    en: "Produce",
    cjCategories: DEPT_TO_CJ.kids,
    subcategories: [],
  },
  {
    slug: "sports",
    label: "건어물",
    en: "Dried Seafood",
    cjCategories: DEPT_TO_CJ.sports,
    subcategories: [],
  },
  {
    slug: "digital",
    label: "주류·청",
    en: "Liquor & Syrup",
    cjCategories: DEPT_TO_CJ.digital,
    subcategories: [],
  },
  {
    slug: "auto",
    label: "B2B 식자재",
    en: "B2B Wholesale",
    cjCategories: DEPT_TO_CJ.auto,
    subcategories: [],
  },
  {
    slug: "others",
    label: "초장집",
    en: "Chojang House",
    cjCategories: DEPT_TO_CJ.others,
    subcategories: [],
  },
];

export const departmentBySlug = (slug: string) =>
  isDashboardDept(slug) ? departments.find((d) => d.slug === slug) : undefined;

/** 부서 + 서브라벨 → LEXI 버킷 key */
export function bucketKeyForSub(deptSlug: string, subLabel: string | undefined | null): string | undefined {
  if (!subLabel) return undefined;
  const dept = departmentBySlug(deptSlug);
  const hit = dept?.subcategories.find((s) => s.label === subLabel);
  return hit?.bucket;
}

/**
 * PDP 속성만족도 라벨
 */
export const PDP_ATTRIBUTES: Record<string, [string, string]> = {
  "women-clothing": ["핏 만족도", "소재 만족도"],
  pet: ["품질 만족도", "내구성 만족도"],
  "home-garden": ["실용성 만족도", "마감 만족도"],
  jewelry: ["디자인 만족도", "품질 만족도"],
  "men-clothing": ["핏 만족도", "소재 만족도"],
  "bags-shoes": ["착용감 만족도", "내구성 만족도"],
  sports: ["기능성 만족도", "내구성 만족도"],
  electronics: ["성능 만족도", "배터리 만족도"],
  "home-improve": ["사용편의성", "내구성 만족도"],
  auto: ["호환성 만족도", "내구성 만족도"],
  phones: ["호환성 만족도", "내구성 만족도"],
  computers: ["성능 만족도", "사용편의성"],
  beauty: ["향 만족도", "제형 만족도"],
  makeup: ["발색 만족도", "지속력 만족도"],
  skincare: ["향 만족도", "제형 만족도"],
  haircare: ["향 만족도", "윤기 만족도"],
  fashion: ["핏 만족도", "소재 만족도"],
  women: ["핏 만족도", "소재 만족도"],
  men: ["핏 만족도", "소재 만족도"],
  outer: ["핏 만족도", "보온감 만족도"],
  bags: ["수납 만족도", "마감 만족도"],
  shoes: ["착화감 만족도", "내구성 만족도"],
  accessories: ["디자인 만족도", "마감 만족도"],
  life: ["실용성 만족도", "마감 만족도"],
  home: ["실용성 만족도", "마감 만족도"],
  etc: ["실용성 만족도", "가성비 만족도"],
  tech: ["성능 만족도", "휴대성 만족도"],
  pets: ["안전성 만족도", "내구성 만족도"],
  underwear: ["핏 만족도", "착용감 만족도"],
  kids: ["안전성 만족도", "내구성 만족도"],
  others: ["실용성 만족도", "가성비 만족도"],
  digital: ["성능 만족도", "호환성 만족도"],
  unmapped: ["실용성 만족도", "가성비 만족도"],
  sourced: ["품질 만족도", "가성비 만족도"],
};

export function pdpAttributesFor(category: string): [string, string] {
  const dept = deptOfCategorySlug(category);
  return PDP_ATTRIBUTES[category] ?? PDP_ATTRIBUTES[dept] ?? PDP_ATTRIBUTES.fashion;
}
