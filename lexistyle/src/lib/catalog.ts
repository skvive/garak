// filepath: src/lib/catalog.ts
/**
 * 카탈로그 어댑터 우선순위:
 * 1) Cafe24 Front API (CAFE24_* 설정 시) — 미설정이면 off
 * 2) Neon products (is_dummy=false) — HQ Import 원장
 * 3) dummy-data — 로컬 미리보기 폴백만
 */
import { cache } from "react";
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import {
  brands,
  catalogIndex,
  categories,
  orders,
  productImages,
  products as productsTable,
  users,
} from "@/db/schema";
import {
  products as dummyProducts,
  bySlug as dummyBySlug,
  finalPrice,
  type Product,
  type CjCategory,
} from "@/lib/dummy-data";
import {
  getCafe24ProductBySlug,
  listCafe24Products,
  searchCafe24Products,
} from "@/lib/cafe24/catalog";
import { cafe24Mode, cafe24StatusPayload } from "@/lib/cafe24/config";
import { getDataMode } from "@/lib/data-mode";
import {
  bucketSlugsForCj,
  cjIdsForDept,
  isDashboardDept,
  productMatchesCategory,
  productMatchesCj,
} from "@/lib/catalog/category-taxonomy";
import type { DashboardDept } from "@/lib/catalog/category-taxonomy";
import { searchCatalog } from "@/lib/catalog/index-store";
import { categorySlugsForDept } from "@/lib/catalog/category-tree";
import { cleanProductName, displayBrand } from "@/lib/catalog/display-name";
import { expandToken, tokenizeQuery } from "@/lib/catalog/search-terms";
import { CJ_LEAF_SLUG_PREFIX, deptOfCategorySlug } from "@/lib/catalog/cj-taxonomy";
import { computeSellPrice } from "@/lib/hq/types";
import {
  bucketKeysForDepartment,
  departmentOfCategorySlug,
  mapCategorySlug,
} from "@/lib/catalog/lexi-cj-categories";
import { localStore } from "@/lib/local-store";
import {
  paginateSlice,
  sortProducts,
  STOREFRONT_PAGE_SIZE,
  type ProductListPage,
  type ProductSort,
} from "@/lib/catalog/pagination";
import { sample3CardImage } from "@/lib/pdp/sample3-helper";

export type { ProductListPage, ProductSort };
export { STOREFRONT_PAGE_SIZE, parsePageParam, pageHref } from "@/lib/catalog/pagination";

export type ProductListFilter = {
  /** 부서 slug (beauty/fashion/life/kids) */
  category?: string;
  /** CJ L3 id (women-clothing/bags-shoes/…) */
  cj?: CjCategory;
  /** LEXI 버킷 slug */
  bucket?: string;
  /** CJ leaf (catalog_index.category_path[1]) — 스토어프론트 3단 하위칩 */
  leaf?: string;
  saleOnly?: boolean;
  brand?: string;
  /** 상품명·카테고리명 검색어 (한글은 영문 상품명 단어로 확장) */
  q?: string;
  /** 검색어 토큰 결합: all(기본, 모두 일치) | any(하나라도 일치) */
  qMode?: "all" | "any";
  /** 판매가 범위(USD, 원장 단위) */
  priceMin?: number;
  priceMax?: number;
};

/**
 * 패션 내 여성의류 세부 카테고리 — "전체 + 추천순" 진열에서 여성 의류를 우선하기 위한 정본.
 * (기존 LEXI 버킷 8개에 women-dresses/women-tops 등 세부 slug는 누락돼 있어 별도 상수로 관리)
 */
const WOMEN_APPAREL_CATEGORIES = [
  "women",
  "women-dresses",
  "women-tops",
  "women-suits",
  "women-outerwear",
  "women-pants",
] as const;

export type { Product };
export { finalPrice };

function mapDbRow(r: {
  slug: string;
  name: string;
  brand: string;
  category: string | null;
  price: string;
  discountRate: number;
  rating: string | null;
  reviewCount: number;
  image: string | null;
}): Product {
  const image =
    r.image ||
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80";
  return {
    slug: r.slug,
    name: cleanProductName(r.name),
    brand: displayBrand(r.brand),
    category: r.category || "sourced",
    price: Number(r.price),
    discountRate: r.discountRate,
    rating: Number(r.rating ?? 0),
    reviewCount: r.reviewCount,
    image: sample3CardImage(image, r.slug),
  };
}

function storefrontBrandLabel(sellerName?: string | null): string {
  const n = (sellerName ?? "").trim();
  if (!n) return "LEXI";
  if (/^cj(\s|$)/i.test(n) || /cjdropshipping/i.test(n) || /^cj\s*(supplier|warehouse|seller)/i.test(n)) {
    return "LEXI";
  }
  return n;
}

function mapCjRow(r: {
  id: number;
  externalId?: string;
  title?: string;
  sellerName?: string | null;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  primaryThumbUrl?: string | null;
}): Product {
  const slug = r.externalId || String(r.id);
  const image =
    r.primaryThumbUrl ||
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80";
  // 스토어프론트 표시가는 LEXI 정책 판매가 — CJ 원가 노출 금지
  const costUsd = parseFloat(r.minPrice ?? "0");
  return {
    slug,
    name: cleanProductName(r.title ?? "Untitled"),
    brand: storefrontBrandLabel(r.sellerName),
    category: mapCategorySlug(r.categoryPath),
    price: costUsd > 0 ? computeSellPrice(costUsd) : 9.99,
    discountRate: 0,
    // 실제 리뷰가 없는 원장 상품 — 평점·리뷰 수를 지어내지 않는다
    rating: 0,
    reviewCount: 0,
    image: sample3CardImage(image, slug),
  };
}

function applyProductFilter(list: Product[], filter?: ProductListFilter): Product[] {
  let out = list;
  if (filter?.brand) out = out.filter((p) => p.brand === filter.brand);
  if (filter?.leaf && filter.leaf.startsWith(CJ_LEAF_SLUG_PREFIX)) {
    out = out.filter((p) => p.category === filter.leaf);
  } else if (filter?.cj) {
    out = out.filter((p) => productMatchesCj(p.category, filter.cj!));
  } else if (filter?.bucket) {
    out = out.filter((p) => p.category === filter.bucket);
  } else if (filter?.category) {
    const dept = filter.category as "beauty" | "fashion" | "life" | "kids" | "others";
    const buckets = bucketKeysForDepartment(dept);
    out = out.filter((p) => {
      if (p.category === filter.category) return true;
      if (deptOfCategorySlug(p.category) === filter.category) return true;
      if (buckets.includes(p.category)) return true;
      if (productMatchesCategory(p.category, filter.category!)) return true;
      return departmentOfCategorySlug(p.category) === filter.category;
    });
  }
  if (filter?.saleOnly) out = out.filter((p) => p.discountRate > 0);
  return out;
}

function catalogRowToProduct(r: {
  id: number;
  externalId: string;
  title: string;
  sellerName?: string | null;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  primaryThumbUrl?: string | null;
}): Product {
  return mapCjRow({
    id: r.id,
    externalId: r.externalId,
    title: r.title,
    sellerName: r.sellerName,
    categoryPath: r.categoryPath,
    minPrice: r.minPrice,
    primaryThumbUrl: r.primaryThumbUrl,
  });
}

async function fromCatalogIndexPage(
  filter: ProductListFilter | undefined,
  page: number,
  pageSize: number,
  sort: ProductSort,
): Promise<ProductListPage<Product> | null> {
  if (!hasDb()) return null;
  try {
    const priceSort = sort === "price-asc" || sort === "price-desc" ? sort : undefined;
    const opts: Parameters<typeof searchCatalog>[0] = {
      supplier: "cjdropshipping",
      page,
      pageSize,
      includeThumb: true,
      scope: "active",
      sort: priceSort,
    };
    if (filter?.leaf) {
      opts.category = filter.leaf;
    } else if (filter?.cj) {
      opts.category = filter.cj;
    } else if (filter?.bucket) {
      opts.lexiBucket = filter.bucket;
    } else if (filter?.category && isDashboardDept(filter.category)) {
      opts.categories = [...cjIdsForDept(filter.category as DashboardDept)];
      opts.scope = "mapped";
    }
    const { items, total } = await searchCatalog(opts);
    if (total === 0) return null;
    let list = items.map(catalogRowToProduct);
    if (filter?.brand) list = list.filter((p) => p.brand === filter.brand);
    if (filter?.saleOnly) list = list.filter((p) => p.discountRate > 0);
    const sorted = priceSort ? list : sortProducts(list, sort);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    return { items: sorted, total, page: safePage, pageSize, totalPages };
  } catch {
    return null;
  }
}

function dbOrderBy(sort: ProductSort, filter?: ProductListFilter) {
  // 패션 "전체 + 추천순" — 여성의류 세부 카테고리를 우선 진열, 나머지는 최신순
  if (sort === "default" && filter?.category === "fashion" && !filter.bucket && !filter.cj) {
    const womenList = sql.join(
      WOMEN_APPAREL_CATEGORIES.map((c) => sql`${c}`),
      sql`, `,
    );
    const womenFirst = sql<number>`case when ${categories.slug} in (${womenList}) then 0 else 1 end`;
    return [asc(womenFirst), desc(productsTable.id)];
  }
  switch (sort) {
    case "review":
      return [desc(productsTable.reviewCount), asc(productsTable.priceUsd)];
    case "price-asc":
      return [asc(productsTable.priceUsd)];
    case "price-desc":
      return [desc(productsTable.priceUsd)];
    case "discount":
      return [desc(productsTable.discountRate)];
    default:
      return [desc(productsTable.id)];
  }
}

function dbWhere(filter?: ProductListFilter, deptSlugs?: string[]) {
  const parts = [
    isNull(productsTable.deletedAt),
    isNull(brands.deletedAt),
    eq(productsTable.isDummy, false),
  ];
  if (filter?.brand) parts.push(eq(brands.name, filter.brand));
  if (filter?.saleOnly) parts.push(gt(productsTable.discountRate, 0));
  if (filter?.priceMin != null && Number.isFinite(filter.priceMin)) parts.push(gte(productsTable.priceUsd, String(filter.priceMin)));
  if (filter?.priceMax != null && Number.isFinite(filter.priceMax)) parts.push(lte(productsTable.priceUsd, String(filter.priceMax)));
  if (filter?.q) {
    // 토큰마다 (상품명 | 브랜드 | 카테고리명 | 영문 확장어) 중 하나에 걸려야 한다. 기본은 모든 토큰 일치(AND), any 면 하나라도(OR)
    const perToken = tokenizeQuery(filter.q).map((token) => {
      const alts = expandToken(token);
      return or(
        ...alts.map((t) => ilike(productsTable.name, `%${t}%`)),
        ilike(categories.name, `%${token}%`),
        ilike(brands.name, `%${token}%`),
      )!;
    });
    if (perToken.length) parts.push(filter.qMode === "any" ? or(...perToken)! : and(...perToken)!);
  }
  if (filter?.leaf && filter.leaf.startsWith(CJ_LEAF_SLUG_PREFIX)) {
    // 하위 카테고리(CJ leaf) 직접 지정
    parts.push(eq(categories.slug, filter.leaf));
  } else if (deptSlugs?.length && !filter?.cj && !filter?.bucket) {
    // 부서 = 부서 자신 + 하위 CJ leaf 카테고리 전부
    parts.push(inArray(categories.slug, deptSlugs));
  } else if (filter?.cj) {
    const buckets = bucketSlugsForCj(filter.cj);
    parts.push(or(eq(categories.slug, filter.cj), inArray(categories.slug, [...buckets]))!);
  } else if (filter?.bucket) {
    // "women" 탭 = 여성의류 세부(women-dresses/tops/outerwear 등) 포함 — SAMPLE3 진열 40개 대상
    if (filter.bucket === "women") {
      parts.push(
        or(...WOMEN_APPAREL_CATEGORIES.map((c) => eq(categories.slug, c)))!,
      );
    } else {
      parts.push(eq(categories.slug, filter.bucket));
    }
  } else if (filter?.category) {
    let buckets = bucketKeysForDepartment(filter.category as "beauty" | "fashion" | "life" | "kids" | "others");
    // 패션 부서는 women-dresses/women-tops 등 세부 카테고리도 포함 (전체 진열 대상)
    if (filter.category === "fashion") buckets = [...buckets, ...WOMEN_APPAREL_CATEGORIES];
    parts.push(or(eq(categories.slug, filter.category), inArray(categories.slug, buckets))!);
  }
  return and(...parts);
}

function dbProductSelect() {
  // product_images에 sort=0 행이 여러 개 남아 있어도 상품은 한 번만 노출한다.
  // 기존 직접 조인은 LIMIT/OFFSET 전에 행을 부풀려 페이지 중복·누락을 만들었다.
  const primaryImage = db()
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(and(eq(productImages.sort, 0), isNull(productImages.deletedAt)))
    .orderBy(productImages.productId, productImages.id)
    .as("primary_product_image");

  return db()
      .select({
        slug: productsTable.slug,
        name: productsTable.name,
        brand: brands.name,
        category: categories.slug,
        price: productsTable.priceUsd,
        discountRate: productsTable.discountRate,
        rating: productsTable.ratingAvg,
        reviewCount: productsTable.reviewCount,
        image: primaryImage.url,
      })
      .from(productsTable)
      .innerJoin(brands, eq(productsTable.brandId, brands.id))
      .innerJoin(categories, eq(productsTable.categoryId, categories.id))
      .leftJoin(primaryImage, eq(primaryImage.productId, productsTable.id));
}

async function fromDb(): Promise<Product[] | null> {
  if (!hasDb()) return null;
  try {
    const rows = await dbProductSelect().where(dbWhere());
    if (!rows.length) return null;
    return rows.map(mapDbRow);
  } catch {
    return null;
  }
}

/** 홈 진열 — 여성의류 PDP 상품(women-*)만. 상세페이지 작업 40개 대상 */
const HOME_CATEGORY_LIKE = "women-%";

export async function listHomeProducts(limit = 40): Promise<Product[]> {
  // 1) Neon products + women-% 카테고리
  if (hasDb()) {
    try {
      const rows = await dbProductSelect()
        .where(
          and(
            isNull(productsTable.deletedAt),
            isNull(brands.deletedAt),
            eq(productsTable.isDummy, false),
            like(categories.slug, HOME_CATEGORY_LIKE),
          ),
        )
        .orderBy(desc(productsTable.reviewCount), asc(productsTable.priceUsd))
        .limit(limit);
      if (rows.length) return rows.map(mapDbRow);
    } catch {
      /* fallthrough */
    }
  }
  // GarakHansang: no DB -> dummy products (review order)
  if (!hasDb()) {
    return sortProducts([...dummyProducts], "review").slice(0, limit);
  }


  // 2) 로컬스트어 폴백 — women 카탈로그
  const all = await collectAllProducts();
  const women = all.filter((p) => p.category.startsWith("women") || p.category.startsWith("Woman"));
  return (women.length ? women : all).slice(0, limit);
}

async function fromDbPage(
  filter: ProductListFilter | undefined,
  page: number,
  pageSize: number,
  sort: ProductSort,
): Promise<ProductListPage<Product> | null> {
  if (!hasDb()) return null;
  try {
    const deptSlugs =
      filter?.category && !filter.leaf && !filter.bucket && !filter.cj
        ? await categorySlugsForDept(filter.category)
        : undefined;
    const where = dbWhere(filter, deptSlugs);
    const [{ c }] = await db()
      .select({ c: count() })
      .from(productsTable)
      .innerJoin(brands, eq(productsTable.brandId, brands.id))
      .innerJoin(categories, eq(productsTable.categoryId, categories.id))
      .where(where);
    const total = Number(c ?? 0);
    if (total === 0) {
      return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const rows = await dbProductSelect()
      .where(where)
      .orderBy(...dbOrderBy(sort, filter))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize);
    return {
      items: rows.map(mapDbRow),
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  } catch {
    return null;
  }
}

export async function listProductsPage(opts?: ProductListFilter & {
  page?: number;
  pageSize?: number;
  sort?: ProductSort;
}): Promise<ProductListPage<Product>> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? STOREFRONT_PAGE_SIZE;
  const sort = opts?.sort ?? "default";
  const filter = opts
    ? {
        category: opts.category,
        cj: opts.cj,
        bucket: opts.bucket,
        leaf: opts.leaf,
        saleOnly: opts.saleOnly,
        brand: opts.brand,
        q: opts.q,
        priceMin: opts.priceMin,
        priceMax: opts.priceMax,
      }
    : undefined;

  // 하위 카테고리(cj-*)는 products.category_id 로 직접 조회 — catalog_index 폴백 아래에서 처리
  // 구 방식 CJ leaf 이름 칩만 catalog_index 우선
  if (filter?.leaf && !filter.leaf.startsWith(CJ_LEAF_SLUG_PREFIX)) {
    const leafPage = await fromCatalogIndexPage(filter, page, pageSize, sort);
    if (leafPage && leafPage.total > 0) return leafPage;
  }

  // Neon products — LIMIT/OFFSET
  const dbPage = await fromDbPage(filter, page, pageSize, sort);
  if (dbPage) return dbPage; // 0건이어도 그대로 — 진열(products) 기준. CJ 원장 폴백은 DB 미연결 모드에서만

  // Neon catalog_index — CJ 원장 LIMIT/OFFSET
  const catalogPage = await fromCatalogIndexPage(filter, page, pageSize, sort);
  if (catalogPage && catalogPage.total > 0) return catalogPage;

  // Cafe24
  if (cafe24Mode() !== "off") {
    const cafe = await listCafe24Products(filter);
    if (cafe?.length) {
      const sorted = sortProducts(cafe, sort);
      return paginateSlice(sorted, page, pageSize);
    }
  }

  // 로컬스토어 CJ
  const ls = localStore() as { catalog?: unknown[] };
  const cjRows = ((ls.catalog ?? []) as Array<Record<string, unknown>>).filter(
    (c) => c.supplierCode === "cjdropshipping" && c.sourceStatus === "active",
  );
  if (cjRows.length > 0) {
    let list = cjRows.map((r) => mapCjRow(r as Parameters<typeof mapCjRow>[0]));
    list = applyProductFilter(list, filter);
    if (list.length > 0) {
      const sorted = sortProducts(list, sort);
      return paginateSlice(sorted, page, pageSize);
    }
  }

  // Dummy fallback
  const mode = await getDataMode().catch(() => ({ mode: "dummy" as const }));
  if (mode.mode === "dummy") {
    const list = applyProductFilter(dummyProducts, filter);
    const sorted = sortProducts(list, sort);
    return paginateSlice(sorted, page, pageSize);
  }

  return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
}

/** 같은 하위 카테고리의 다른 상품 N개 (DB 한 번, LIMIT). 전체 상품 로딩 금지. */
export async function listRelatedProducts(product: { slug: string; category: string }, limit = 4): Promise<Product[]> {
  if (hasDb()) {
    try {
      const rows = await dbProductSelect()
        .where(and(dbWhere(), eq(categories.slug, product.category), ne(productsTable.slug, product.slug)))
        .orderBy(desc(productsTable.id))
        .limit(limit);
      return rows.map(mapDbRow);
    } catch {
      /* fall through */
    }
  }
  const all = await collectAllProducts();
  return all.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, limit);
}

export async function listProducts(filter?: ProductListFilter): Promise<Product[]> {
  return collectAllProducts(filter);
}

async function collectAllProducts(filter?: ProductListFilter): Promise<Product[]> {
  if (hasDb()) {
    const dbRows = await fromDb();
    if (dbRows?.length) return applyProductFilter(dbRows, filter);
  }
  // GarakHansang: DB 없음 → 더미 상품을 최우선 반환 (구 로컬 JSON 카탈로그 우선순위 해제)
  if (!hasDb()) return applyProductFilter(dummyProducts, filter);
  if (cafe24Mode() !== "off") {
    const cafe = await listCafe24Products(filter);
    if (cafe?.length) return cafe;
  }
  const ls = localStore() as { catalog?: unknown[] };
  const cjRows = ((ls.catalog ?? []) as Array<Record<string, unknown>>).filter(
    (c) => c.supplierCode === "cjdropshipping" && c.sourceStatus === "active",
  );
  if (cjRows.length > 0) {
    const list = applyProductFilter(
      cjRows.map((r) => mapCjRow(r as Parameters<typeof mapCjRow>[0])),
      filter,
    );
    if (list.length > 0) return list;
  }
  const mode = await getDataMode().catch(() => ({ mode: "dummy" as const }));
  if (mode.mode === "dummy") return applyProductFilter(dummyProducts, filter);
  return [];
}

export const getProductBySlug = cache(getProductBySlugUncached);

async function getProductBySlugUncached(slug: string): Promise<Product | undefined> {
  // DB 우선
  if (hasDb()) {
    try {
      const [row] = await dbProductSelect()
        .where(and(dbWhere(), eq(productsTable.slug, slug)))
        .limit(1);
      if (row) return mapDbRow(row);
    } catch {
      /* catalog fallback */
    }
    // catalog_index.externalId (= slug) — PDP 진열 상품 폴백
    try {
      const [row] = await db()
        .select({
          id: catalogIndex.id,
          externalId: catalogIndex.externalId,
          title: catalogIndex.title,
          sellerName: catalogIndex.sellerName,
          categoryPath: catalogIndex.categoryPath,
          minPrice: catalogIndex.minPrice,
          primaryThumbUrl: catalogIndex.primaryThumbUrl,
        })
        .from(catalogIndex)
        .where(eq(catalogIndex.externalId, slug))
        .limit(1);
      if (row) return catalogRowToProduct(row);
    } catch {
      /* ignore */
    }
  }

  // Cafe24
  if (cafe24Mode() !== "off") {
    const cafe = await getCafe24ProductBySlug(slug);
    if (cafe) return cafe;
  }

  // 로컬스토어 CJ 실상품 (PDP 문서 있는 항목 포함)
  const ls = localStore() as { catalog?: unknown[] };
  const cjRow = ((ls.catalog ?? []) as Array<Record<string, unknown>>).find(
    (c) =>
      (c.externalId === slug || String(c.id) === slug) &&
      (c.supplierCode === "cjdropshipping" || c.supplierCode === "storefront-pdp") &&
      c.sourceStatus === "active",
  );
  if (cjRow) return mapCjRow(cjRow as Parameters<typeof mapCjRow>[0]);

  // Dummy fallback (개발참조용)
  const mode = await getDataMode().catch(() => ({ mode: "dummy" as const }));
  if (mode.mode === "dummy") {
    return dummyProducts.find((p) => p.slug === slug) ?? dummyBySlug(slug);
  }
  return undefined;
}

/**
 * Best 진열 — SAMPLE3/HQ PDP 문서가 연결된 상품만
 * Neon: catalog_index.document_id IS NOT NULL → products 조인 우선, 없으면 catalog 행
 * Local JSON: catalog.documentId 있는 항목
 */
export async function listBestProductsPage(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<ProductListPage<Product>> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? STOREFRONT_PAGE_SIZE;

  if (hasDb()) {
    try {
      const withDoc = and(
        isNull(productsTable.deletedAt),
        eq(productsTable.isDummy, false),
      );
      // products ← catalog.documentId
      const [{ c: joinedCount }] = await db()
        .select({ c: count() })
        .from(productsTable)
        .innerJoin(catalogIndex, eq(catalogIndex.productId, productsTable.id))
        .innerJoin(brands, eq(productsTable.brandId, brands.id))
        .innerJoin(categories, eq(productsTable.categoryId, categories.id))
        .where(and(withDoc, isNotNull(catalogIndex.documentId)))
      const joinedTotal = Number(joinedCount ?? 0);

      if (joinedTotal > 0) {
        const totalPages = Math.max(1, Math.ceil(joinedTotal / pageSize));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const rows = await db()
          .select({
            slug: productsTable.slug,
            name: productsTable.name,
            brand: brands.name,
            category: categories.slug,
            price: productsTable.priceUsd,
            discountRate: productsTable.discountRate,
            rating: productsTable.ratingAvg,
            reviewCount: productsTable.reviewCount,
            image: productImages.url,
          })
          .from(productsTable)
          .innerJoin(catalogIndex, eq(catalogIndex.productId, productsTable.id))
          .innerJoin(brands, eq(productsTable.brandId, brands.id))
          .innerJoin(categories, eq(productsTable.categoryId, categories.id))
          .leftJoin(
            productImages,
            and(eq(productImages.productId, productsTable.id), eq(productImages.sort, 0)),
          )
          .where(and(withDoc, isNotNull(catalogIndex.documentId)))
          .orderBy(
            desc(sql<number>`case when exists (
              select 1 from export_shelf es
              where es.document_id = ${catalogIndex.documentId}
                and es.catalog_id = ${catalogIndex.id}
                and es.stage = 'shelf'
                and es.channels_desired @> ARRAY['amazon_au']::text[]
            ) then 1 else 0 end`),
            desc(productsTable.reviewCount),
            desc(productsTable.id),
          )
          .limit(pageSize)
          .offset((safePage - 1) * pageSize);
        return {
          items: rows.map((r) => ({ ...mapDbRow(r), badge: "BEST" as const })),
          total: joinedTotal,
          page: safePage,
          pageSize,
          totalPages,
        };
      }

      // product_id 없는 PDP 카탈로그 폴백
      const d = db();
      const [{ c: docCount }] = await d
        .select({ c: count() })
        .from(catalogIndex)
        .where(and(eq(catalogIndex.sourceStatus, "active"), isNotNull(catalogIndex.documentId)));
      const docTotal = Number(docCount ?? 0);
      if (docTotal > 0) {
        const totalPages = Math.max(1, Math.ceil(docTotal / pageSize));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const catRows = await d
          .select({
            id: catalogIndex.id,
            externalId: catalogIndex.externalId,
            title: catalogIndex.title,
            sellerName: catalogIndex.sellerName,
            categoryPath: catalogIndex.categoryPath,
            minPrice: catalogIndex.minPrice,
            primaryThumbUrl: catalogIndex.primaryThumbUrl,
          })
          .from(catalogIndex)
          .where(and(eq(catalogIndex.sourceStatus, "active"), isNotNull(catalogIndex.documentId)))
          .orderBy(
            desc(sql<number>`case when exists (
              select 1 from export_shelf es
              where es.document_id = ${catalogIndex.documentId}
                and es.catalog_id = ${catalogIndex.id}
                and es.stage = 'shelf'
                and es.channels_desired @> ARRAY['amazon_au']::text[]
            ) then 1 else 0 end`),
            desc(catalogIndex.id),
          )
          .limit(pageSize)
          .offset((safePage - 1) * pageSize);
        return {
          items: catRows.map((r) => ({ ...catalogRowToProduct(r), badge: "BEST" as const })),
          total: docTotal,
          page: safePage,
          pageSize,
          totalPages,
        };
      }
    } catch {
      /* fall through */
    }
  }

  // GarakHansang: no DB -> dummy products (review order)
  if (!hasDb()) {
    const list = sortProducts([...dummyProducts], "review");
    return paginateSlice(list, page, pageSize);
  }


  // 로컬 JSON — documentId 있는 카탈로그
  const ls = localStore() as { catalog?: unknown[] };
  const withPdp = ((ls.catalog ?? []) as Array<Record<string, unknown>>).filter(
    (c) => c.documentId != null && c.sourceStatus === "active",
  );
  if (withPdp.length > 0) {
    const list = withPdp.map((r) => ({
      ...mapCjRow(r as Parameters<typeof mapCjRow>[0]),
      badge: "BEST" as const,
    }));
    return paginateSlice(sortProducts(list, "review"), page, pageSize);
  }

  // Dummy BEST 뱃지 폴백
  const mode = await getDataMode().catch(() => ({ mode: "dummy" as const }));
  if (mode.mode === "dummy") {
    const list = dummyProducts.filter((p) => p.badge === "BEST");
    return paginateSlice(sortProducts(list, "review"), page, pageSize);
  }

  return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
}

export async function searchProductsPage(
  q: string,
  opts?: { page?: number; pageSize?: number; sort?: ProductSort; priceMin?: number; priceMax?: number; saleOnly?: boolean },
): Promise<ProductListPage<Product>> {
  const needle = q.trim().toLowerCase();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? STOREFRONT_PAGE_SIZE;
  const sort = opts?.sort ?? "default";
  if (!needle) {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }

  const match = (p: Product) =>
    p.name.toLowerCase().includes(needle) ||
    p.brand.toLowerCase().includes(needle) ||
    p.slug.includes(needle);

  if (hasDb()) {
    const base = { q: needle, priceMin: opts?.priceMin, priceMax: opts?.priceMax, saleOnly: opts?.saleOnly };
    let dbPage = await fromDbPage(base, page, pageSize, sort);
    // 여러 단어 검색이 0건이면 하나라도 일치하는 상품으로 넓혀 보여준다
    if (dbPage && dbPage.total === 0 && tokenizeQuery(needle).length > 1) {
      dbPage = await fromDbPage({ ...base, qMode: "any" }, page, pageSize, sort);
    }
    if (dbPage) return dbPage; // 0건이어도 그대로 반환 — 진열되지 않은 원장 상품을 노출하지 않는다
  }

  if (cafe24Mode() !== "off") {
    const cafe = await searchCafe24Products(q);
    if (cafe.length) {
      const sorted = sortProducts(cafe, sort);
      return paginateSlice(sorted, page, pageSize);
    }
  }

  const all = await collectAllProducts();
  const sorted = sortProducts(all.filter(match), sort);
  return paginateSlice(sorted, page, pageSize);
}

export async function searchProducts(q: string): Promise<Product[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  // DB 우선
  if (hasDb()) {
    const dbRows = await fromDb();
    if (dbRows?.length) {
      return dbRows.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle) ||
          p.slug.includes(needle),
      );
    }
  }

  // Cafe24
  if (cafe24Mode() !== "off") {
    const cafe = await searchCafe24Products(q);
    if (cafe.length) return cafe;
  }

  // Dummy
  const all = await listProducts();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      p.brand.toLowerCase().includes(needle) ||
      p.slug.includes(needle),
  );
}

export async function adminStats() {
  const cafe = cafe24StatusPayload();
  if (cafe24Mode() !== "off") {
    const cafeProducts = await listCafe24Products();
    if (cafeProducts) {
      return {
        products: cafeProducts.length,
        brands: new Set(cafeProducts.map((p) => p.brand)).size,
        orders: 0,
        users: 0,
        source: "cafe24" as const,
        cafe24: cafe,
      };
    }
  }

  if (!hasDb()) {
    return {
      products: dummyProducts.length,
      brands: new Set(dummyProducts.map((p) => p.brand)).size,
      orders: 0,
      users: 0,
      source: "dummy" as const,
      cafe24: cafe,
    };
  }
  try {
    const d = db();
    const [p] = await d
      .select({ c: count() })
      .from(productsTable)
      .where(isNull(productsTable.deletedAt));
    const [b] = await d.select({ c: count() }).from(brands).where(isNull(brands.deletedAt));
    const [o] = await d.select({ c: count() }).from(orders).where(isNull(orders.deletedAt));
    const [u] = await d.select({ c: count() }).from(users).where(isNull(users.deletedAt));
    return {
      products: Number(p?.c ?? 0),
      brands: Number(b?.c ?? 0),
      orders: Number(o?.c ?? 0),
      users: Number(u?.c ?? 0),
      source: "neon" as const,
      cafe24: cafe,
    };
  } catch {
    return {
      products: dummyProducts.length,
      brands: new Set(dummyProducts.map((p) => p.brand)).size,
      orders: 0,
      users: 0,
      source: "dummy" as const,
      cafe24: cafe,
    };
  }
}
