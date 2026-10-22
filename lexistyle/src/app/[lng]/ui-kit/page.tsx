/**
 * LEXI 커머스 UI 킷 — Phase 1 산출물 검수용.
 * docs/lexi-mobile-ui-spec.md 의 컴포넌트 인벤토리를 한 화면에서 확인한다.
 */
import {
  Badge,
  Chip,
  ChipRail,
  DeliveryBadge,
  FilterButton,
  PriceBlock,
  Rating,
  SectionHeader,
  Skeleton,
} from "@/components/ui/commerce";
import { CircleCategoryRail, QuickLinkGrid } from "@/components/commerce/rails";
import { ProductCardDense } from "@/components/commerce/product-card-dense";
import { products } from "@/lib/dummy-data";

export const metadata = { title: "UI 킷" };

const QUICK = [
  { key: "new" as const, label: "신상품", href: "/best", corner: "NEW" },
  { key: "deal" as const, label: "특가", href: "/sale", corner: "-50%" },
  { key: "beauty" as const, label: "뷰티", href: "/category/beauty" },
  { key: "fashion" as const, label: "패션", href: "/category/fashion" },
  { key: "life" as const, label: "리빙", href: "/category/life" },
  { key: "kids" as const, label: "키즈", href: "/category/kids" },
  { key: "food" as const, label: "푸드", href: "/category/life" },
  { key: "brand" as const, label: "브랜드관", href: "/brands" },
  { key: "gift" as const, label: "기프트", href: "/best" },
  { key: "coupon" as const, label: "쿠폰", href: "/sale" },
];

const CIRCLES = [
  { key: "beauty" as const, label: "스킨케어", href: "#", active: true },
  { key: "beauty" as const, label: "메이크업", href: "#" },
  { key: "fashion" as const, label: "의류", href: "#" },
  { key: "fashion" as const, label: "가방", href: "#" },
  { key: "life" as const, label: "홈리빙", href: "#" },
  { key: "kids" as const, label: "키즈", href: "#" },
  { key: "food" as const, label: "푸드", href: "#" },
];

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line pb-6">
      <h3 className="px-4 pb-3 pt-6 text-[12px] font-bold uppercase tracking-widest text-dim">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function UiKitPage() {
  const sample = products.slice(0, 4);

  return (
    <main className="mx-auto max-w-[480px] pb-24">
      <header className="pdp-hero-gradient px-4 pb-6 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-coral">Phase 1</p>
        <h1 className="mt-1 font-display text-[26px] leading-tight text-ink">
          LEXI 커머스 UI 킷
        </h1>
        <p className="mt-1.5 text-[12px] text-dim">
          한국어 우선 · USD 병행 · 밀집형 구조 + 에디토리얼 비주얼
        </p>
      </header>

      <Row title="배지 / Badges">
        <div className="flex flex-wrap gap-1.5 px-4">
          <Badge tone="sale">특가</Badge>
          <Badge tone="express">익스프레스</Badge>
          <Badge tone="fresh">신선</Badge>
          <Badge tone="premium">PREMIUM</Badge>
          <Badge tone="new">NEW</Badge>
          <Badge tone="neutral">일반</Badge>
        </div>
        <div className="mt-2 flex gap-1.5 px-4">
          <DeliveryBadge grade="express" />
          <DeliveryBadge grade="standard" />
          <DeliveryBadge grade="fresh" />
        </div>
      </Row>

      <Row title="가격 블록 / Price">
        <div className="flex items-start gap-8 px-4">
          <PriceBlock priceUsd={12.9} discountRate={35} />
          <PriceBlock priceUsd={48.5} discountRate={0} />
          <PriceBlock
            priceUsd={7.9}
            discountRate={20}
            unitLabel="(100g당 1,240원)"
          />
        </div>
        <div className="mt-4 px-4">
          <div className="pdp-price-gradient rounded-xl border border-line p-4">
            <PriceBlock priceUsd={12.9} discountRate={35} size="lg" />
          </div>
        </div>
      </Row>

      <Row title="별점 / Rating">
        <div className="space-y-1.5 px-4">
          <Rating value={4.6} count={1138} />
          <Rating value={3.2} count={57} />
        </div>
      </Row>

      <Row title="칩 레일 / Chips">
        <ChipRail>
          <Chip active>전체</Chip>
          <Chip>신상품</Chip>
          <Chip>베스트</Chip>
          <Chip>특가</Chip>
          <Chip>무료배송</Chip>
          <Chip>리뷰 많은순</Chip>
        </ChipRail>
        <div className="px-4">
          <FilterButton count={2} />
        </div>
      </Row>

      <Row title="퀵링크 그리드 / Quick links">
        <QuickLinkGrid items={QUICK} />
      </Row>

      <Row title="원형 카테고리 레일 / Circle rail">
        <CircleCategoryRail items={CIRCLES} />
      </Row>

      <Row title="섹션 헤더 + 밀집 그리드 / Dense grid">
        <SectionHeader title="오늘의 추천" sub="큐레이터가 고른 신상" href="/best" />
        <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4">
          {sample.map((p, i) => (
            <ProductCardDense
              key={p.slug}
              product={p}
              extras={{
                delivery: i % 3 === 0 ? "express" : i % 3 === 1 ? "standard" : "fresh",
                freeShipping: i % 2 === 0,
                flag: i === 0 ? { label: "특가", tone: "sale" } : undefined,
              }}
            />
          ))}
        </div>
      </Row>

      <Row title="스켈레톤 / Loading">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 px-4">
          <div className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
          <div className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
      </Row>
    </main>
  );
}
