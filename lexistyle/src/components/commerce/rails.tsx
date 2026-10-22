/**
 * 레일/그리드 네비게이션 — docs/lexi-mobile-ui-spec.md §C-QuickLinkGrid, §C-CircleCategoryRail
 * 아이콘은 외부 이미지 의존 없이 인라인 SVG(그라데이션)로 자체 생성한다.
 */
import Link from "next/link";

/* ─────────────── 자체 생성 아이콘 (그라데이션 SVG) ─────────────── */

export type IconKey =
  | "new"
  | "deal"
  | "beauty"
  | "fashion"
  | "life"
  | "kids"
  | "food"
  | "gift"
  | "look"
  | "brand"
  | "coupon"
  | "skincare"
  | "makeup"
  | "bag"
  | "shoes"
  | "home"
  | "tech"
  | "pet"
  | "travel"
  | "sports"
  | "auto"
  | "jewelry";

const ICON: Record<IconKey, { from: string; to: string; path: string }> = {
  new: { from: "#ff8a7a", to: "#e03e30", path: "M12 3l2.4 5.6L20 10l-4.2 3.9L17 20l-5-2.9L7 20l1.2-6.1L4 10l5.6-1.4z" },
  deal: { from: "#ffc46b", to: "#e8352b", path: "M4 12l8-8 8 8-8 8zM12 8v8M9 12h6" },
  beauty: { from: "#ffb3c7", to: "#e0577a", path: "M12 3c3 3 5 5.6 5 8.5A5 5 0 017 11.5C7 8.6 9 6 12 3z" },
  fashion: { from: "#9fd0c4", to: "#5c7a6e", path: "M9 3l3 2 3-2 4 3-2 3v10H7V9L5 6z" },
  life: { from: "#a9c7ef", to: "#2b6cf0", path: "M4 11l8-7 8 7v9H4zM10 20v-5h4v5" },
  kids: { from: "#ffd79b", to: "#e79c2a", path: "M12 4a4 4 0 110 8 4 4 0 010-8zM5 20c0-3.5 3-6 7-6s7 2.5 7 6z" },
  food: { from: "#b6e0a8", to: "#12a15a", path: "M6 3v8a3 3 0 006 0V3M9 11v10M17 3c-1.5 2-2 4-2 6v12" },
  gift: { from: "#d9b7ef", to: "#8a5fc4", path: "M3 9h18v4H3zM5 13h14v8H5zM12 9v12M8 9a2.5 2.5 0 110-5c2 0 4 2.5 4 5M16 9a2.5 2.5 0 100-5c-2 0-4 2.5-4 5" },
  look: { from: "#d4c4a8", to: "#5c7a6e", path: "M8 4h8l2 5H6zM7 9h10v11H7zM10 14h4" },
  brand: { from: "#e0cfa8", to: "#8a6d3b", path: "M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7z" },
  coupon: { from: "#ffb0a5", to: "#ff5c4d", path: "M3 8h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4zM12 8v10" },
  skincare: { from: "#ffd6e0", to: "#e0577a", path: "M12 3c2.5 2.5 5 5.5 5 9a5 5 0 01-10 0c0-3.5 2.5-6.5 5-9zM9 14h6" },
  makeup: { from: "#f2c6e0", to: "#b25ca0", path: "M8 3h8l-1 5H9zM9 8h6l2 13H7z" },
  bag: { from: "#c9b8ef", to: "#6a4fb0", path: "M8 8V6a4 4 0 118 0v2M4 8h16l-1.5 13h-13z" },
  shoes: { from: "#bcd8f0", to: "#3f7ac2", path: "M3 17c0-3 2-4 5-5l4-4 6 3c2 1 3 2 3 6z" },
  home: { from: "#c8e6d6", to: "#4a9c72", path: "M4 11l8-7 8 7v9H4zM9 20v-6h6v6" },
  tech: { from: "#bcd0f0", to: "#3a5fc0", path: "M5 4h14v13H5zM9 20h6M8 17v3M16 17v3" },
  pet: { from: "#ffe1b8", to: "#d68a2a", path: "M7 8a1.6 1.6 0 110-3.2A1.6 1.6 0 017 8zM12 6a1.6 1.6 0 110-3.2A1.6 1.6 0 0112 6zM17 8a1.6 1.6 0 110-3.2A1.6 1.6 0 0117 8zM6 12a1.6 1.6 0 110-3.2A1.6 1.6 0 016 12zM8 16c0-2.5 2-4 4-4s4 1.5 4 4-1.5 4-4 4-4-1.5-4-4z" },
  travel: { from: "#b8e2ef", to: "#2a8ab0", path: "M4 9l16-5-5 16-3-7z" },
  sports: { from: "#8ed1c9", to: "#25a69a", path: "M3 6h18M8 6v4a4 4 0 008 0V6M7 20l5-10 5 10M12 10v10" },
  auto: { from: "#c9b8ef", to: "#6a4fb0", path: "M3 18h2l1-4h12l1 4h2M5 14l2-8h10l2 8M7 16a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0M14 16a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0" },
  jewelry: { from: "#f2d76b", to: "#d4a017", path: "M12 3c2 3 2 6 2 8s-1 3-2 4c-1-1-2-2-2-4s0-5 2-8zM9 15l3 5 3-5" },
};

export function RailIcon({ name, size = 28 }: { name: IconKey; size?: number }) {
  const g = ICON[name];
  const id = `g-${name}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </linearGradient>
      </defs>
      <path
        d={g.path}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────── 퀵링크 그리드 (5열 × N행) ─────────────── */

export type QuickLink = {
  key: IconKey;
  label: string;
  en?: string;
  href: string;
  corner?: string; // NEW / -50% 등 코너 배지
};

export function QuickLinkGrid({ items }: { items: QuickLink[] }) {
  return (
    <nav aria-label="바로가기" className="grid grid-cols-5 gap-y-4 px-3 py-4">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          className="group flex flex-col items-center gap-1.5 text-center"
        >
          <span className="relative grid size-12 place-items-center rounded-2xl bg-fog transition-colors group-hover:bg-fog-deep">
            <RailIcon name={it.key} />
            {it.corner && (
              <span className="absolute -right-1 -top-1 rounded-full bg-sale px-1.5 py-[1px] text-[9px] font-bold text-white">
                {it.corner}
              </span>
            )}
          </span>
          <span className="text-[11px] font-semibold leading-tight text-ink-soft">
            {it.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/* ─────────────── 원형 카테고리 레일 ─────────────── */

export type CircleItem = { label: string; href: string; key: IconKey; active?: boolean };

export function CircleCategoryRail({ items }: { items: CircleItem[] }) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
      {items.map((it) => (
        <Link key={it.label} href={it.href} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
          <span
            className={`grid size-14 place-items-center rounded-full border transition-colors ${
              it.active ? "border-ink bg-ink/5" : "border-line bg-fog"
            }`}
          >
            <RailIcon name={it.key} size={24} />
          </span>
          <span
            className={`w-full truncate text-center text-[11px] ${
              it.active ? "font-bold text-ink" : "font-medium text-dim"
            }`}
          >
            {it.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
