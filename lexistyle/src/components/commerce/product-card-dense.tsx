/**
 * 밀집형 상품 카드 — 카테고리/검색/리스트 그리드용.
 * docs/lexi-mobile-ui-spec.md §C-ProductCard
 *
 * 홈·기획전의 에디토리얼 카드(components/product-card.tsx)와 역할 분리:
 *  - 이 카드: 정보밀도 최우선(배지·할인율·별점·배송등급·퀵담기)
 *  - 에디토리얼 카드: 여백과 사진 중심
 */
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/dummy-data";
import { Badge, DeliveryBadge, PriceBlock, QuickAddButton, Rating } from "@/components/ui/commerce";
import { sample3CardImage } from "@/lib/pdp/sample3-helper";

export type DenseCardExtras = {
  /** 배송 등급 — 공급처 리드타임에서 파생 */
  delivery?: "express" | "standard" | "fresh";
  /** 좌상단 강조 배지 */
  flag?: { label: string; tone?: "sale" | "premium" | "fresh" | "new" };
  /** 단위가격 병기 "(100g당 1,234원)" */
  unitLabel?: string | null;
  /** 무료배송 여부 */
  freeShipping?: boolean;
};

export function ProductCardDense({
  product,
  extras,
  rank,
}: {
  product: Product;
  extras?: DenseCardExtras;
  rank?: number;
}) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-fog">
        <Image
          src={sample3CardImage(product.image, product.slug)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {rank !== undefined && (
          <span className="price absolute left-1.5 top-1.5 grid size-6 place-items-center rounded bg-ink/85 text-[12px] font-bold text-white">
            {rank}
          </span>
        )}
        {extras?.flag && (
          <span className="absolute left-1.5 top-1.5">
            <Badge tone={extras.flag.tone ?? "sale"}>{extras.flag.label}</Badge>
          </span>
        )}
        <QuickAddButton />
      </div>

      <div className="mt-2 space-y-1">
        <p className="line-clamp-2 text-[12.5px] leading-[1.35] text-ink-soft">{product.name}</p>

        <PriceBlock
          priceUsd={product.price}
          discountRate={product.discountRate}
          unitLabel={extras?.unitLabel}
        />

        {product.reviewCount > 0 && <Rating value={product.rating} count={product.reviewCount} />}

        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {extras?.delivery && <DeliveryBadge grade={extras.delivery} />}
          {extras?.freeShipping && <span className="text-[10px] font-bold text-fresh">무료배송</span>}
        </div>
      </div>
    </Link>
  );
}
