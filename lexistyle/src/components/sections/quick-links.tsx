import { QuickLinkGrid } from "@/components/commerce/rails";

/**
 * 홈 퀵링크 그리드 — docs/lexi-mobile-ui-spec.md §S-002 홈(비로그인) 퀵링크 그리드 이식.
 * 쿠팡 원본의 라벨/아이콘 이미지는 쓰지 않고 LEXI 자체 카피 + 그라데이션 SVG로 재창작.
 * 모바일 전용(밀집형 정보구조), 데스크톱은 기존 GNB로 충분히 커버됨.
 */
const LINKS = [
  { key: "deal" as const, label: "오늘시세", href: "/prices", corner: "LIVE" },
  { key: "new" as const, label: "시세 급락", href: "/best", corner: "▼" },
  { key: "beauty" as const, label: "수산", href: "/category/beauty" },
  { key: "fashion" as const, label: "한 상", href: "/category/fashion" },
  { key: "life" as const, label: "축산", href: "/category/life" },
  { key: "kids" as const, label: "청과", href: "/category/kids" },
  { key: "gift" as const, label: "초장집", href: "/category/others" },
  { key: "brand" as const, label: "초장집 예약", href: "/reservation" },
  { key: "food" as const, label: "홈마카세", href: "/subscription" },
  { key: "look" as const, label: "점포관", href: "/brands" },
];

export function QuickLinks() {
  return (
    <section aria-label="바로가기" className="border-b border-line md:hidden">
      <QuickLinkGrid items={LINKS} />
    </section>
  );
}
