/** 스토어프론트 상품 그리드 — 페이지당 최대 40개 */
export const STOREFRONT_PAGE_SIZE = 40;

export type ProductSort = "review" | "price-asc" | "price-desc" | "discount" | "default";

export type ProductListPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function parsePageParam(raw?: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function paginateSlice<T>(all: T[], page: number, pageSize: number): ProductListPage<T> {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/** slug 기반 안정적 reviewCount (페이지네이션·정렬 일관성) */
export function stableReviewCount(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  return (Math.abs(h) % 499) + 1;
}

export function sortProducts<T extends { reviewCount: number; price: number; discountRate: number }>(
  items: T[],
  sort: ProductSort,
): T[] {
  const list = [...items];
  switch (sort) {
    case "review":
      return list.sort((a, b) => b.reviewCount - a.reviewCount || a.price - b.price);
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "discount":
      return list.sort((a, b) => b.discountRate - a.discountRate);
    default:
      return list;
  }
}

export function pageHref(
  pathname: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  if (page > 1) q.set("page", String(page));
  else q.delete("page");
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
