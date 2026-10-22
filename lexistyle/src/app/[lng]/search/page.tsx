// filepath: src/app/search/page.tsx
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductCardDense } from "@/components/commerce/product-card-dense";
import { ProductPagination } from "@/components/commerce/product-pagination";
import { SortFilterBar, parsePriceRange, parseSort } from "@/components/commerce/sort-filter-bar";
import {
  listProductsPage,
  parsePageParam,
  searchProductsPage,
  STOREFRONT_PAGE_SIZE,
} from "@/lib/catalog";
import type { Product } from "@/lib/dummy-data";

export const metadata = { title: "검색 | 가락한상" };
export const dynamic = "force-dynamic";

function deriveExtras(p: Product) {
  return {
    delivery: (p.category === "home-garden" ? "fresh" : p.reviewCount >= 1000 ? "express" : "standard") as
      | "fresh"
      | "express"
      | "standard",
    freeShipping: p.discountRate > 0 || p.reviewCount >= 1000,
    flag: p.badge
      ? { label: p.badge === "DEAL" ? "특가" : p.badge, tone: (p.badge === "DEAL" ? "sale" : "new") as "sale" | "new" }
      : undefined,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; pmin?: string; pmax?: string; sale?: string }>;
}) {
  const { q: qRaw, sort: sortRaw, page: pageRaw, pmin, pmax, sale } = await searchParams;
  const q = qRaw?.trim().slice(0, 60) || undefined;
  const page = parsePageParam(pageRaw);
  const sort = parseSort(sortRaw);
  const { priceMin, priceMax } = parsePriceRange(pmin, pmax);
  // 실제로 진열 중인 카테고리 기준 추천 검색어
  const trending = ["원피스", "목걸이", "크로스백", "블라우스", "팔찌", "레깅스"];

  const result = q
    ? await searchProductsPage(q, { page, pageSize: STOREFRONT_PAGE_SIZE, sort, priceMin, priceMax, saleOnly: sale === "1" })
    : await listProductsPage({ page: 1, pageSize: 8 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="sr-only">상품 검색</h1>
      <form>
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-fog px-4 py-3.5">
          <Search className="size-5 text-dim" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="브랜드, 상품, #LEXILOOK 검색"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-dim"
          />
        </label>
      </form>

      {!q && (
        <div className="mt-5">
          <p className="text-[12px] font-bold text-dim">지금 뜨는 검색어</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {trending.map((t, i) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-line px-3.5 py-1.5 text-[13px]"
              >
                <span className="price mr-1.5 font-bold text-coral">{i + 1}</span>
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-1 mt-9 text-[16px] font-bold">
        {q ? `"${q}" 검색 결과 (${result.total.toLocaleString()})` : "새로 들어온 상품"}
      </h2>

      {q ? (
        <>
          <div className="-mx-4">
            <SortFilterBar pathname="/search" query={{ q, sort: sortRaw ? sort : undefined, pmin, pmax, sale }} />
          </div>
          {result.total === 0 && (
            <p className="mt-10 text-center text-[14px] text-dim">
              &ldquo;{q}&rdquo;에 맞는 상품이 없어요. 다른 검색어로 찾아보세요.
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
            {result.items.map((p) => (
              <ProductCardDense key={p.slug} product={p} extras={deriveExtras(p)} />
            ))}
          </div>
          <ProductPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            pathname="/search"
            query={{ q, sort: sortRaw ? sort : undefined, pmin, pmax, sale }}
          />
        </>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4">
          {result.items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
