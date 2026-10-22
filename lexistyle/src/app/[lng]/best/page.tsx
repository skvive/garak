import { listBestProductsPage, parsePageParam, STOREFRONT_PAGE_SIZE } from "@/lib/catalog";
import { ProductCardDense, type DenseCardExtras } from "@/components/commerce/product-card-dense";
import { ProductPagination } from "@/components/commerce/product-pagination";
import type { Product } from "@/lib/dummy-data";

export const metadata = { title: "오늘의 시세 급락 | 가락한상" };
export const dynamic = "force-dynamic";

function deriveExtras(p: Product, _i: number): DenseCardExtras {
  return {
    delivery: p.reviewCount >= 1000 ? "express" : "standard",
    freeShipping: p.discountRate > 0 || p.reviewCount >= 500,
  };
}

/** Best — SAMPLE3 PDP가 생성된 진열용 상품 */
export default async function BestPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = parsePageParam(pageRaw);

  const result = await listBestProductsPage({ page, pageSize: STOREFRONT_PAGE_SIZE });
  const items = result.items;
  const rankOffset = (result.page - 1) * result.pageSize;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="border-b border-line px-4 pb-3 pt-5">
        <h1 className="font-display text-[24px] font-semibold">
          오늘의 시세 급락
          <span className="ml-2 text-[13px] font-normal text-dim">
            {result.total > 0 ? `${result.total.toLocaleString()}개 · PDP 진열` : "큐레이션"}
          </span>
        </h1>
        <p className="mt-1 text-[12px] leading-relaxed text-dim">
          SAMPLE3 상품페이지가 준비된 LEXI Curated 셀렉션
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-16 px-4 text-center text-dim">곧 새로운 셀렉션이 도착합니다.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 px-4 md:grid-cols-4">
          {items.map((p, i) => (
            <ProductCardDense
              key={p.slug}
              product={p}
              extras={deriveExtras(p, rankOffset + i)}
              rank={rankOffset + i + 1}
            />
          ))}
        </div>
      )}

      <ProductPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        pathname="/best"
      />
    </div>
  );
}
