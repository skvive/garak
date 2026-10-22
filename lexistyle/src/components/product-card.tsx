import Image from "next/image";
import Link from "next/link";
import { finalPrice, productMeta, type Product } from "@/lib/dummy-data";
import { priceLabels } from "@/lib/format";
import { WishlistButton } from "@/components/wishlist-button";
import { sample3CardImage } from "@/lib/pdp/sample3-helper";

/** 카드 정보는 이미지·브랜드·상품명·가격·♥ 5요소로 제한 — spec §3.4 #4 */
export function ProductCard({ product, rank }: { product: Product; rank?: number }) {
  const discounted = product.discountRate > 0;
  const meta = productMeta[product.slug];
  const fresh = ["beauty", "women-clothing", "home-garden", "kids"].includes(product.category as string);
  const now = priceLabels(finalPrice(product));
  const was = discounted ? priceLabels(product.price).primary : null;
  return (
    <Link href={`/product/${product.slug}`} className="group block" target="_blank">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-fog ${meta?.soldout ? "opacity-70" : ""}`}>
        <Image
          src={sample3CardImage(product.image, product.slug)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${meta?.soldout ? "grayscale" : ""}`}
        />
        {rank !== undefined && (
          <span className="price absolute left-2 top-2 grid size-7 place-items-center rounded-md bg-ink/85 text-[13px] font-bold text-white">
            {rank}
          </span>
        )}
        {/* 신선도 뱃지 3종 — 살수율/시세급락/당일경매/제철 (디자인 기획서 §2-3) */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {meta?.fatGrade && (
            <span className="badge-grade-a rounded-full px-2 py-0.5 text-[10px] font-bold">
              {meta.fatGrade}
            </span>
          )}
          {product.badge === "DEAL" && (
            <span className="badge-price-down rounded-full px-2 py-0.5 text-[10px] font-bold">
              시세 ▼{product.discountRate}%
            </span>
          )}
          {product.badge === "NEW" && (
            <span className="badge-auction rounded-full px-2 py-0.5 text-[10px] font-bold">
              당일경매
            </span>
          )}
          {product.badge === "BEST" && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-white">
              제철 NOW
            </span>
          )}
        </div>
        {/* 배송 방식 뱃지 — 오늘회/인어교주해적단식 상품별 배송 안내 */}
        <span className="absolute bottom-2 left-2 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {fresh ? "🚚 당일·새벽" : "📦 택배 익일"}
        </span>
        {meta?.soldout && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="rounded-lg bg-ink/80 px-3 py-1.5 text-[14px] font-bold text-white">
              SOLDOUT
            </span>
          </span>
        )}
        <div className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-white/90 text-ink opacity-90 shadow-sm">
          <WishlistButton slug={product.slug} />
        </div>
      </div>
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <p className="text-[11px] font-bold tracking-wide text-dim">{product.brand}</p>
        <p className="line-clamp-1 text-[14px] leading-snug">{product.name}</p>
        <p className="price flex items-baseline gap-1.5 pt-0.5 text-[16px] font-semibold">
          {discounted && <span className="text-coral">{product.discountRate}%</span>}
          <span>{now.primary}</span>
          {was && <span className="text-[12px] font-normal text-dim line-through">{was}</span>}
        </p>
        {meta?.sizes && (
          <p className="text-[10px] font-medium text-dim">크기 · {meta.sizes}</p>
        )}
        {meta?.origin && (
          <p className="text-[10px] font-medium text-sage">
            원산지 {meta.origin}
            {meta.fatGrade ? ` · ${meta.fatGrade}` : ""}
          </p>
        )}
        {product.reviewCount >= 500 && (
          <p className="text-[10px] text-dim">
            이번 주 {Math.floor(product.reviewCount / 7)}+명 구매
          </p>
        )}
        <p className="price text-[10px] text-dim">{now.secondary}</p>
      </div>
    </Link>
  );
}
