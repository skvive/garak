import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { subcategoriesForDept } from "@/lib/catalog/category-tree";
import { siteUrl } from "@/lib/site-url";
import { listProductsPage, parsePageParam, STOREFRONT_PAGE_SIZE } from "@/lib/catalog";
import { hasDb } from "@/db";
import Image from "next/image";
import { departmentBySlug } from "@/lib/departments";
import {
  leafDefsForDeptWithCount,
  productsForLeaf,
  productsForDept,
  dbLeafDefsForDept,
  type LocalCatalogRow,
} from "@/lib/catalog/category-browse";
import {
  storefrontBucketsForDepartment,
  bucketByKey,
} from "@/lib/catalog/lexi-cj-categories";
import { BUCKET_TO_CJ, isCjCategory } from "@/lib/catalog/category-taxonomy";
import type { DashboardDept } from "@/lib/catalog/category-taxonomy";
import { ProductCardDense, type DenseCardExtras } from "@/components/commerce/product-card-dense";
import { ProductPagination } from "@/components/commerce/product-pagination";
import { ExpandableChips } from "@/components/commerce/expandable-chips";
import { SortFilterBar, parsePriceRange, parseSort } from "@/components/commerce/sort-filter-bar";
import { Chip, ChipRail, FilterButton, SectionHeader } from "@/components/ui/commerce";
import type { Product } from "@/lib/dummy-data";
import { products as dummyProducts } from "@/lib/dummy-data";

export const dynamic = "force-dynamic";

/** 카테고리마다 고유한 제목·설명·canonical (검색 결과/공유 카드가 전부 같은 문구로 나오던 문제) */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ cat: string; lng: string }>;
  searchParams: Promise<{ leaf?: string }>;
}): Promise<Metadata> {
  const { cat, lng } = await params;
  const { leaf } = await searchParams;
  const dept = departmentBySlug(cat);
  if (!dept) return { title: "카테고리" };
  const sub = leaf ? (await subcategoriesForDept(cat)).find((c) => c.slug === leaf) : undefined;
  const label = sub ? `${sub.name} · ${dept.label}` : dept.label;
  const canonical = `${siteUrl()}/${lng}/category/${cat}${sub ? `?leaf=${encodeURIComponent(sub.slug)}` : ""}`;
  const description = sub
    ? `${sub.name} ${sub.count}개 — LEXI가 고른 ${dept.label} 셀렉션. 관세 포함 가격으로 해외에서 바로 배송합니다.`
    : `${dept.label}(${dept.en}) 셀렉션 — LEXI가 고른 상품을 관세 포함 가격으로 해외에서 바로 배송합니다.`;
  return { title: label, description, alternates: { canonical }, openGraph: { title: label, description, url: canonical } };
}

function deriveExtras(p: Product, i: number): DenseCardExtras {
  const delivery: DenseCardExtras["delivery"] =
    p.category === "home" || p.category === "life" || p.category === "etc"
      ? "fresh"
      : p.reviewCount >= 1000
        ? "express"
        : "standard";
  return {
    delivery,
    freeShipping: p.discountRate > 0 || p.reviewCount >= 1000,
    flag:
      p.badge === "DEAL"
        ? { label: "특가", tone: "sale" }
        : p.badge === "NEW"
          ? { label: "NEW", tone: "new" }
          : i === 0
            ? { label: "BEST", tone: "premium" }
            : undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ cat: string }>;
  searchParams: Promise<{ bucket?: string; sub?: string; sort?: string; cj?: string; page?: string; leaf?: string; q?: string; pmin?: string; pmax?: string; sale?: string }>;
}) {
  const { cat } = await params;
  const { bucket: bucketParam, sub, cj: cjParam, page: pageRaw, leaf, sort: sortRaw, q: qRaw, pmin, pmax, sale } = await searchParams;
  const q = qRaw?.trim().slice(0, 60) || undefined;
  const sort = parseSort(sortRaw);
  const { priceMin, priceMax } = parsePriceRange(pmin, pmax);
  const page = parsePageParam(pageRaw);
  const dept = departmentBySlug(cat);
  if (!dept) notFound();

  // 하위 분류는 DB의 CJ leaf 카테고리(leafDefs)가 정본 — 구 LEXI 버킷 칩은 더 이상 쓰지 않는다
  const storeBuckets: ReturnType<typeof storefrontBucketsForDepartment> =
    hasDb() || !["beauty", "fashion", "life", "kids", "others"].includes(cat)
      ? []
      : storefrontBucketsForDepartment(cat as "beauty" | "fashion" | "life" | "kids" | "others");
  const bucketKeys = storeBuckets.map((b) => b.key);
  let bucketFilter = bucketParam && bucketKeys.includes(bucketParam) ? bucketParam : undefined;
  if (!bucketFilter && sub) {
    const hit = dept.subcategories.find((s) => s.label === sub);
    if (hit) bucketFilter = hit.bucket;
  }
  if (!bucketFilter && cjParam) {
    const mapped = Object.entries(BUCKET_TO_CJ).find(([, cj]) => cj === cjParam)?.[0];
    if (mapped && bucketKeys.includes(mapped)) bucketFilter = mapped;
  }

  const cjFilter = cjParam && isCjCategory(cjParam) ? cjParam : undefined;

  // 로컬 스토어 모드: categoryBrowse/catalog(로컬 JSON)
  // DB 모드: category_cj_leaves(이식 원장) + catalog_index 라이브 카운트
  const browseMode = !hasDb();
  const leafDefs = browseMode ? leafDefsForDeptWithCount(cat) : await dbLeafDefsForDept(cat, bucketFilter);
  const activeLeaf = leaf && leafDefs.some((d) => d.leaf === leaf) ? leaf : undefined;
  const localItems: LocalCatalogRow[] = browseMode
    ? activeLeaf
      ? productsForLeaf(activeLeaf)
      : productsForDept(cat)
    : [];

  // 가락한상 더미 모드: 부서별 상품 그리드 직접 구성
  const DEPT_TO_DUMMY: Record<string, string[]> = {
    beauty: ["beauty"],
    fashion: ["women-clothing"],
    life: ["home-garden"],
    kids: ["kids"],
    others: ["pet"],
    digital: ["electronics"],
    sports: ["sports"],
    auto: ["auto"],
  };
  const dummyDeptItems = dummyProducts.filter((p) =>
    (DEPT_TO_DUMMY[cat] ?? []).includes(p.category as string),
  );
  const browseTotalPages = Math.max(1, Math.ceil(dummyDeptItems.length / STOREFRONT_PAGE_SIZE));
  const browsePage = Math.min(Math.max(1, page), browseTotalPages);
  const result = browseMode
    ? {
        items: dummyDeptItems.slice(
          (browsePage - 1) * STOREFRONT_PAGE_SIZE,
          browsePage * STOREFRONT_PAGE_SIZE,
        ),
        page: browsePage,
        totalPages: browseTotalPages,
        total: dummyDeptItems.length,
        pageSize: STOREFRONT_PAGE_SIZE,
      }
    : await listProductsPage({
        category: cat as DashboardDept,
        bucket: bucketFilter,
        cj: cjFilter,
        leaf: activeLeaf,
        q,
        priceMin,
        priceMax,
        saleOnly: sale === "1",
        sort,
        page,
        pageSize: STOREFRONT_PAGE_SIZE,
      });
  const items = result.items;

  const activeBucket = bucketFilter ? bucketByKey(bucketFilter) : undefined;
  const titleLabel = activeLeaf
    ? (leafDefs.find((d) => d.leaf === activeLeaf)?.ko ?? activeLeaf)
    : (activeBucket?.label ?? dept.label);
  const subLabels = dept.subcategories.map((s) => s.label).join(" · ");

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="border-b border-line px-4 pb-3 pt-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-dim">
          <Link href="/category" className="hover:text-ink">
            카테고리
          </Link>
          <span>/</span>
          <Link href={`/category/${cat}`} className="font-semibold text-ink hover:underline">
            {dept.label}
          </Link>
          {activeBucket && (
            <>
              <span>/</span>
              <span className="font-semibold text-ink">{activeBucket.label}</span>
            </>
          )}
          {activeLeaf && (
            <>
              <span>/</span>
              <span className="font-semibold text-ink">{titleLabel}</span>
            </>
          )}
        </div>
        <h1 className="mt-1 font-display text-[24px] font-semibold">
          {titleLabel}
          <span className="ml-2 text-[13px] font-normal text-dim">{result.total.toLocaleString()}개 · 관세 포함가</span>
        </h1>
        {leafDefs.length > 0 ? (
          <p className="mt-1 text-[12px] leading-relaxed text-dim">
            {dept.en} · 하위 카테고리 {leafDefs.length}개
          </p>
        ) : (
          subLabels && (
            <p className="mt-1 text-[12px] leading-relaxed text-dim">
              {dept.en} · {subLabels}
            </p>
          )
        )}
        <form action={`/category/${cat}`} className="mt-3">
          {bucketFilter && <input type="hidden" name="bucket" value={bucketFilter} />}
          {cjFilter && <input type="hidden" name="cj" value={cjFilter} />}
          {activeLeaf && <input type="hidden" name="leaf" value={activeLeaf} />}
          {sortRaw && <input type="hidden" name="sort" value={sort} />}
          <label className="flex items-center gap-2.5 rounded-full bg-fog px-4 py-2.5">
            <span className="text-dim">⌕</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={`${activeLeaf ? titleLabel : dept.label} 내에서 검색하기`}
              className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-dim"
            />
          </label>
        </form>
      </div>

      {(!browseMode || leafDefs.length === 0) && storeBuckets.length > 0 && (
        <ChipRail>
          <Chip href={`/category/${cat}`} active={!bucketFilter}>
            전체
          </Chip>
          {storeBuckets.map((b) => (
            <Chip
              key={b.key}
              href={`/category/${cat}?bucket=${b.key}`}
              active={bucketFilter === b.key}
            >
              {b.label}
            </Chip>
          ))}
        </ChipRail>
      )}

      {leafDefs.length > 0 && (
        <ExpandableChips
          allHref={bucketFilter ? `/category/${cat}?bucket=${bucketFilter}` : `/category/${cat}`}
          allActive={!activeLeaf}
          items={leafDefs.map((d) => ({
            key: d.leaf,
            href: bucketFilter
              ? `/category/${cat}?bucket=${bucketFilter}&leaf=${encodeURIComponent(d.leaf)}`
              : `/category/${cat}?leaf=${encodeURIComponent(d.leaf)}`,
            label: d.ko,
            count: d.count,
            active: activeLeaf === d.leaf,
          }))}
        />
      )}

      <SortFilterBar
        pathname={`/category/${cat}`}
        query={{ sort: sortRaw ? sort : undefined, pmin, pmax, sale, q, leaf: activeLeaf, bucket: bucketFilter }}
      />

      <SectionHeader title={`${titleLabel} 전체`} />

      {browseMode ? (
        dummyDeptItems.length > 0 ? (
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-6 px-4 md:grid-cols-4">
            {dummyDeptItems.map((p, i) => (
              <ProductCardDense key={p.slug} product={p} extras={deriveExtras(p, i)} />
            ))}
          </div>
        ) : localItems.length === 0 ? (
          <p className="mt-16 px-4 text-center text-dim">곧 새로운 셀렉션이 도착합니다.</p>
        ) : (
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-6 px-4 md:grid-cols-4">
            {localItems.map((p, i) => (
              <LocalCatalogCard key={p.id} row={p} rank={i + 1} dept={cat} />
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <p className="mt-16 px-4 text-center text-dim">
          {q || pmin || pmax || sale ? "조건에 맞는 상품이 없어요. 검색어나 필터를 바꿔 보세요." : "곧 새로운 셀렉션이 도착합니다."}
        </p>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-6 px-4 md:grid-cols-4">
          {items.map((p, i) => (
            <ProductCardDense key={p.slug} product={p} extras={deriveExtras(p, i)} />
          ))}
        </div>
      )}

      {!browseMode && (
        <ProductPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          pathname={`/category/${cat}`}
          query={{
            bucket: bucketFilter,
            sub: sub && !bucketFilter ? sub : undefined,
            cj: cjFilter,
            leaf: activeLeaf,
            q,
            sort: sortRaw ? sort : undefined,
            pmin,
            pmax,
            sale,
          }}
        />
      )}
    </div>
  );
}

/** 로컬 catalog 상품 카드 — CJ 썸네일 + 한글/영문 제목 + 판매가 */
function LocalCatalogCard({
  row,
  rank,
  dept,
}: {
  row: LocalCatalogRow;
  rank: number;
  dept: string;
}) {
  const price = Number(row.minPrice ?? 0);
  const sellUsd = price > 0 ? (price + 20) * 1.3 : 0;
  const img = row.primaryThumbUrl;
  return (
    <div className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-fog">
        {img ? (
          <Image
            src={img}
            alt={row.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-dim">
            image
          </div>
        )}
        <span className="price absolute left-1.5 top-1.5 grid size-6 place-items-center rounded bg-ink/85 text-[12px] font-bold text-white">
          {rank}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <p className="line-clamp-2 text-[12.5px] leading-[1.35] text-ink-soft">
          {row.titleKo || row.title}
        </p>
        <p className="text-[13px] font-semibold text-ink">
          {sellUsd > 0 ? `$${sellUsd.toFixed(2)}` : "—"}
        </p>
        <p className="text-[10px] text-dim/70">{dept === "life" ? "홈리빙" : dept}</p>
      </div>
    </div>
  );
}
