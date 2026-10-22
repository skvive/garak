import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Star, Truck, ShieldCheck } from "lucide-react";
import { DutyCalculator } from "@/components/duty-calculator";
import { ProductCard } from "@/components/product-card";
import { ProductBuyBar } from "@/components/product-buy-bar";
import { getStorefrontOptions } from "@/lib/pdp/storefront-options";
import { AddToLookButton } from "@/components/looks/AddToLookButton";
import { WishlistButton } from "@/components/wishlist-button";
import { ReviewForm } from "@/components/review-form";
import { finalPrice, getProductBySlug, listRelatedProducts } from "@/lib/catalog";
import { listReviews } from "@/lib/reviews";
import { resolveStorefrontPdp } from "@/lib/pdp/storefront";
import { STOREFRONT_USP_TEXT, STOREFRONT_6NOTICE_HTML } from "@/lib/pdp/storefront";
import { buildProductMetadata } from "@/lib/seo/og";
import { priceLabels } from "@/lib/format";
import { getSample3StorefrontOverride } from "@/lib/pdp/sample3-overrides";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductPageControls } from "@/components/admin/product-page-controls";

/** Neon/빌드 환경 DB 불안정 시 SSG 실패 방지 — 런타임 렌더 */
export const dynamic = "force-dynamic";

async function ProductBuyBarFromNeon({ slug }: { slug: string }) {
  const options = await getStorefrontOptions(slug);
  return <ProductBuyBar slug={slug} options={options} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lng: string }>;
}): Promise<Metadata> {
  const { slug, lng } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  const pdpOverride = getSample3StorefrontOverride(product.slug);
  const price = finalPrice(product);
  return buildProductMetadata({
    title: pdpOverride?.structured.title ?? product.name,
    description: pdpOverride?.structured.subtitle ?? `${product.brand} · $${price} · LEXI Curated K-Style`,
    image: pdpOverride?.assetUrls[0] ?? product.image,
    path: `/${lng}/product/${product.slug}`,
    brand: product.brand,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; lng: string }> }) {
  const { slug, lng } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const price = finalPrice(product);
  const now = priceLabels(price);
  const was = product.discountRate > 0 ? priceLabels(product.price).primary : null;
  const [related, realReviews, pdp, admin] = await Promise.all([
    listRelatedProducts(product, 4),
    listReviews(product.slug),
    resolveStorefrontPdp(product),
    requireAdmin(),
  ]);
  // 평점·리뷰 수는 실제 등록된 리뷰로만 표시 (시드값 노출 금지)
  const reviewAvg = realReviews.length
    ? Math.round((realReviews.reduce((a, r) => a + Number(r.rating ?? 0), 0) / realReviews.length) * 10) / 10
    : 0;
  return (
    <article className="bg-[var(--paper,#faf9f7)]">
      <div className="mx-auto max-w-3xl md:grid md:max-w-6xl md:grid-cols-[minmax(0,1fr)_380px] md:items-start md:gap-8 md:px-4">
      {/* linkrcode / SAMPLE3 에디토리얼 본문 */}
      <div
        className="lexi-pdp-editorial px-0 pb-8 pt-0 md:pt-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[14px] [&_section]:px-4 [&_section]:md:px-0"
        dangerouslySetInnerHTML={{ __html: pdp.html }}
      />

      {/* 커머스 레이어 — 모바일: 본문 아래 / PC: 우측 고정 패널 */}
      <div className="space-y-4 border-t border-line px-4 py-8 md:sticky md:top-20 md:border-t-0 md:px-0 md:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold tracking-wide text-dim">{product.brand}</p>
            <h2 className="mt-0.5 text-[18px] font-bold leading-snug text-ink">{product.name}</h2>
            {realReviews.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2 text-[13px]">
                <span className="flex items-center gap-1 font-bold">
                  <Star className="size-3.5 fill-gold text-gold" /> {reviewAvg}
                </span>
                <Link href="#reviews" className="text-dim underline underline-offset-4">
                  리뷰 {realReviews.length.toLocaleString()}개
                </Link>
              </div>
            )}
          </div>
          <WishlistButton slug={product.slug} size="lg" />
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="price flex items-baseline gap-2 text-[26px] font-bold">
            {product.discountRate > 0 && <span className="text-coral">{product.discountRate}%</span>}
            <span>{now.primary}</span>
            {was && <span className="text-[15px] font-normal text-dim line-through">{was}</span>}
          </p>
          <p className="price text-[12px] text-dim">{now.secondary}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-express">
            <Truck className="size-3.5" /> 관세 포함가 · 결제 후 추가 청구 없음
          </p>
        </div>

        <DutyCalculator price={price} />
        <AddToLookButton slug={product.slug} />

        {admin && (
          <ProductPageControls
            lng={lng}
            slug={product.slug}
            currentName={product.name}
            redirectHref={`/${lng}/best`}
          />
        )}

        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-sage">
          <ShieldCheck className="size-4" /> {STOREFRONT_USP_TEXT}
        </p>
      </div>
      </div>

      <section style={{ borderTop: '1px solid var(--line)', padding: '28px 0' }}>
        <div dangerouslySetInnerHTML={{ __html: STOREFRONT_6NOTICE_HTML }} />
      </section>

      <section id="reviews" className="mx-auto max-w-3xl px-4 pb-8">
        <h2 className="text-[18px] font-bold">고객 리뷰</h2>
        {realReviews.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {realReviews.map((r) => (
              <blockquote key={r.id} className="rounded-xl bg-fog p-4 text-[13px] leading-relaxed">
                <p className="mb-2 flex gap-0.5 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-gold" : "fill-line"}`} />
                  ))}
                </p>
                <p>{r.body}</p>
                <footer className="mt-2 font-semibold text-dim">
                  {r.authorName ?? "구매자"} · {r.createdAt.toLocaleDateString("ko-KR")}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-dim">아직 등록된 리뷰가 없습니다.</p>
        )}
        <div className="mt-5 max-w-md">
          <ReviewForm slug={product.slug} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-28">
        <h2 className="mb-4 text-[18px] font-bold">함께 본 상품</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur-md md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3 md:max-w-6xl">
          <div className="relative hidden size-12 shrink-0 overflow-hidden rounded-lg sm:block">
            <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />
          </div>
          <p className="price hidden text-[18px] font-bold sm:block">{now.primary}</p>
          <Suspense
            fallback={
              <div className="flex-1 rounded-xl bg-fog px-4 py-3.5 text-center text-[14px] font-bold text-dim">
                옵션 확인 중…
              </div>
            }
          >
            <ProductBuyBarFromNeon slug={product.slug} />
          </Suspense>
        </div>
      </div>
    </article>
  );
}
