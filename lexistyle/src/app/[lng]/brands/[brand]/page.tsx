// filepath: src/app/brands/[brand]/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import { listProductsPage, parsePageParam, STOREFRONT_PAGE_SIZE } from "@/lib/catalog";
import { brandSpotlight } from "@/lib/dummy-data";
import { ProductCardDense } from "@/components/commerce/product-card-dense";
import { ProductPagination } from "@/components/commerce/product-pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  return { title: decodeURIComponent(brand) };
}

/** §S-025/S-026 브랜드샵 헤더 패턴 이식.
 *  ⚠️ 정직성 원칙: 실제 스토리/태그라인이 있는 브랜드(SEOULINE)만 리치 히어로를 쓰고,
 *  나머지는 지어낸 카피 없이 담백한 헤더만 노출한다(허위 브랜드 스토리 금지). */
export default async function BrandShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { brand: encoded } = await params;
  const { page: pageRaw } = await searchParams;
  const page = parsePageParam(pageRaw);
  const brand = decodeURIComponent(encoded);
  const result = await listProductsPage({ brand, page, pageSize: STOREFRONT_PAGE_SIZE });
  const items = result.items;
  if (result.total === 0) notFound();

  const rated = items.filter((p) => p.reviewCount > 0);
  const avgRating = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : 0;
  const isSpotlight = brand === brandSpotlight.name;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      {isSpotlight ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]">
          <Image src={brandSpotlight.image} alt={brand} fill sizes="100vw" className="object-cover" />
          <div className="img-scrim absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h1 className="font-display text-[28px] font-semibold">{brand}</h1>
            <p className="mt-1 max-w-lg text-[13px] text-white/85">{brandSpotlight.tagline}</p>
          </div>
        </div>
      ) : (
        <div className="border-b border-line px-4 pb-4 pt-6">
          <h1 className="font-display text-[26px] font-semibold">{brand}</h1>
          <p className="mt-1 text-[12px] text-dim">
            {result.total.toLocaleString()}개 상품{avgRating > 0 && ` · 평균 ★${avgRating.toFixed(1)}`}
          </p>
        </div>
      )}

      {isSpotlight && brandSpotlight.story && (
        <p className="border-b border-line px-4 py-5 text-[14px] leading-relaxed text-dim">
          {brandSpotlight.story}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pt-6 md:grid-cols-4">
        {items.map((p) => (
          <ProductCardDense key={p.slug} product={p} />
        ))}
      </div>

      <ProductPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        pathname={`/brands/${encodeURIComponent(brand)}`}
      />
    </div>
  );
}
