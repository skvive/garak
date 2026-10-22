/**
 * 커머스 프리미티브 — docs/lexi-mobile-ui-spec.md §2 컴포넌트 인벤토리 구현.
 *
 * 설계 원칙(하이브리드):
 *  - 정보밀도는 대형 커머스 수준(작은 타이포·촘촘한 간격·배지 다층)
 *  - 비주얼 언어는 LEXI 에디토리얼(코랄/세이지/골드, 라운드, 여백 리듬)
 *  - 표기는 한국어 우선 + 영문/USD 병행
 */
import Link from "next/link";
import { ChevronRight, Star, SlidersHorizontal, Plus } from "lucide-react";
import { priceLabels, listPriceFrom } from "@/lib/format";

/* ─────────────── 배지 ─────────────── */

export type BadgeTone = "sale" | "express" | "fresh" | "premium" | "neutral" | "new";

const BADGE_TONE: Record<BadgeTone, string> = {
  sale: "bg-sale text-white",
  express: "bg-express text-white",
  fresh: "bg-fresh text-white",
  premium: "bg-premium text-white",
  neutral: "bg-fog-deep text-ink-soft",
  new: "bg-ink text-white",
};

export function Badge({
  children,
  tone = "neutral",
  outline = false,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  outline?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[4px] px-1.5 py-[2px] text-[10px] font-bold leading-[1.4] ${
        outline ? "border border-current bg-transparent" : BADGE_TONE[tone]
      }`}
    >
      {children}
    </span>
  );
}

/** 배송 등급 배지 — LEXI 자체 체계 (공급처 리드타임 기반) */
export function DeliveryBadge({ grade }: { grade: "express" | "standard" | "fresh" }) {
  const map = {
    express: { label: "익스프레스", en: "Express", tone: "express" as const },
    standard: { label: "일반배송", en: "Standard", tone: "neutral" as const },
    fresh: { label: "신선배송", en: "Fresh", tone: "fresh" as const },
  }[grade];
  return (
    <Badge tone={map.tone}>
      <span className="tracking-tight">{map.label}</span>
    </Badge>
  );
}

/* ─────────────── 별점 ─────────────── */

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`별점 ${value.toFixed(1)}점`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`size-[11px] ${i < Math.round(value) ? "fill-gold text-gold" : "fill-line text-line"}`}
          strokeWidth={0}
        />
      ))}
      {count !== undefined && (
        <span className="ml-0.5 text-[11px] text-dim">({count.toLocaleString("ko-KR")})</span>
      )}
    </div>
  );
}

/* ─────────────── 가격 블록 ─────────────── */

export function PriceBlock({
  priceUsd,
  discountRate = 0,
  size = "sm",
  showUsd = true,
  unitLabel,
}: {
  priceUsd: number;
  discountRate?: number;
  size?: "sm" | "lg";
  showUsd?: boolean;
  unitLabel?: string | null;
}) {
  const { primary, secondary } = priceLabels(priceUsd);
  const listUsd = listPriceFrom(priceUsd, discountRate);
  const list = listUsd ? priceLabels(listUsd).primary : null;

  return (
    <div className="price">
      {list && (
        <div className="text-[11px] text-dim line-through">{list}</div>
      )}
      <div className="flex items-baseline gap-1">
        {discountRate > 0 && (
          <span className={`font-extrabold text-sale ${size === "lg" ? "text-[20px]" : "text-[13px]"}`}>
            {Math.round(discountRate)}%
          </span>
        )}
        <span className={`font-extrabold text-ink ${size === "lg" ? "text-[22px]" : "text-[14px]"}`}>
          {primary}
        </span>
      </div>
      {showUsd && <div className="text-[10px] text-dim">{secondary}</div>}
      {unitLabel && <div className="text-[10px] text-dim">{unitLabel}</div>}
    </div>
  );
}

/* ─────────────── 섹션 헤더 ─────────────── */

export function SectionHeader({
  title,
  sub,
  href,
  icon,
}: {
  title: string;
  sub?: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-ink">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {sub && <p className="mt-0.5 truncate text-[11px] text-dim">{sub}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-dim hover:text-ink"
        >
          더보기
          <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ─────────────── 칩 / 칩 레일 ─────────────── */

export function Chip({
  children,
  active = false,
  href,
}: {
  children: React.ReactNode;
  active?: boolean;
  href?: string;
}) {
  const cls = `inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
    active
      ? "border-ink bg-ink text-paper"
      : "border-line bg-paper text-ink-soft hover:border-ink/40"
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function ChipRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">{children}</div>
  );
}

/* ─────────────── 필터 버튼 ─────────────── */

export function FilterButton({ count = 0 }: { count?: number }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft"
    >
      <SlidersHorizontal className="size-3.5" />
      필터
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

/* ─────────────── 퀵 담기 버튼 ─────────────── */

export function QuickAddButton({ label = "장바구니 담기" }: { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full border border-line bg-paper/95 text-ink shadow-sm backdrop-blur transition-colors hover:bg-ink hover:text-paper"
    >
      <Plus className="size-4" />
    </button>
  );
}

/* ─────────────── 속성만족도 바 ─────────────── */

/** docs/lexi-mobile-ui-spec.md §C-AttributeSatisfactionBar — 카테고리별 동적 라벨.
 *  값은 임의 난수가 아니라 상품 평점에서 결정적으로 파생한다(정직성 유지). */
export function AttributeSatisfactionBar({ label, percent }: { label: string; percent: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[12px] text-ink-soft">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fog-deep">
        <div className="h-full rounded-full bg-coral" style={{ width: `${p}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[12px] font-bold text-ink">{p}%</span>
    </div>
  );
}

/* ─────────────── 스켈레톤 ─────────────── */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-fog-deep ${className}`} />;
}
