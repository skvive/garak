/** HQ 사이드바 내비 — PieChain HQ_NAV 패턴, LEXI 도메인 */
export type HqNavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type HqNavSection = {
  section: string;
  items: HqNavItem[];
};

export const HQ_NAV: HqNavSection[] = [
  {
    section: "개요",
    items: [{ label: "홈", href: "/hq" }],
  },
  {
    section: "소싱 파이프라인",
    items: [
      { label: "카탈로그 인덱스", href: "/hq/pipeline/catalog" },
      { label: "Import", href: "/hq/pipeline/import" },
      { label: "PDP 생성·편집", href: "/hq/pipeline/pdp" },
      { label: "Export", href: "/hq/pipeline/export" },
      { label: "진열대기", href: "/hq/pipeline/export/shelf" },
    ],
  },
  {
    section: "공급·큐레이션",
    items: [
      { label: "공급처", href: "/hq/suppliers" },
      { label: "내 재고", href: "/hq/cj-inventory" },
      { label: "소싱요청", href: "/hq/cj-sourcing" },
      { label: "컬렉션", href: "/hq/collections" },
    ],
  },
  {
    section: "판매채널",
    items: [{ label: "판매채널", href: "/hq/channels" }],
  },
  {
    section: "주문 운영",
    items: [
      { label: "구매요청", href: "/hq/purchase-requests" },
      { label: "소싱발주", href: "/hq/sourcing-orders" },
      { label: "정산", href: "/hq/settlements" },
    ],
  },
  {
    section: "커머스 원장",
    items: [
      { label: "상품", href: "/hq/products" },
      { label: "주문", href: "/hq/orders" },
      { label: "배너", href: "/hq/banners" },
      { label: "분산원장", href: "/hq/ledger" },
    ],
  },
  {
    section: "스튜디오",
    items: [
      { label: "LEXI Studio", href: "/studio", external: true },
      { label: "Cafe24 연결", href: "/studio/cafe24", external: true },
    ],
  },
  {
    section: "시스템",
    items: [{ label: "시스템·Data Mode", href: "/hq/system" }],
  },
];

/** 구 /admin 경로 → /hq */
export const ADMIN_TO_HQ: Record<string, string> = {
  "/admin": "/hq",
  "/admin/sourcing": "/hq/pipeline/catalog",
  "/admin/products": "/hq/products",
  "/admin/orders": "/hq/orders",
  "/admin/banners": "/hq/banners",
  "/admin/cafe24": "/hq/channels",
};
