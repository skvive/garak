import { QuickLinkGrid } from "@/components/commerce/rails";

/**
 * 홈 퀵링크 그리드 — docs/lexi-mobile-ui-spec.md §S-002 홈(비로그인) 퀵링크 그리드 이식.
 * 쿠팡 원본의 라벨/아이콘 이미지는 쓰지 않고 LEXI 자체 카피 + 그라데이션 SVG로 재창작.
 * 모바일 전용(밀집형 정보구조), 데스크톱은 기존 GNB로 충분히 커버됨.
 */
const LINKS = [
  { key: "new" as const, label: "신상 도착", href: "/best", corner: "NEW" },
  { key: "deal" as const, label: "타임특가", href: "/sale", corner: "SALE" },
  { key: "beauty" as const, label: "뷰티", href: "/category/beauty" },
  { key: "fashion" as const, label: "패션", href: "/category/fashion" },
  { key: "life" as const, label: "리빙", href: "/category/life" },
  { key: "kids" as const, label: "키즈", href: "/category/kids" },
  { key: "sports" as const, label: "스포츠", href: "/category/sports" },
  { key: "tech" as const, label: "디지털", href: "/category/digital" },
  { key: "auto" as const, label: "자동차", href: "/category/auto" },
  { key: "gift" as const, label: "기타", href: "/category/others" },
  { key: "brand" as const, label: "브랜드관", href: "/brands" },
  { key: "look" as const, label: "룩보드", href: "/looks" },
  { key: "food" as const, label: "트렌드", href: "/trend" },
];

export function QuickLinks() {
  return (
    <section aria-label="바로가기" className="border-b border-line md:hidden">
      <QuickLinkGrid items={LINKS} />
    </section>
  );
}
