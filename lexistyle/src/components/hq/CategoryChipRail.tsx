"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * HQ 파이프라인 공통 카테고리 칩 레일
 * - 1줄 고정 (nowrap)
 * - 브라우저 폭에 맞춰 레일 너비 가변 (w-full / min-w-0)
 * - 넘치면 좌우 스크롤 + 화살표 버튼
 * - categories: 라벨 문자열 또는 { key, label } (key = lexiBucket)
 */
export function CategoryChipRail({
  categories,
  active,
  onSelect,
  allLabel = "전체",
}: {
  categories: Array<string | { key: string; label: string }>;
  active: string;
  onSelect: (category: string) => void;
  allLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const chips = categories.map((c) =>
    typeof c === "string" ? { key: c, label: c } : c,
  );

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, categories]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.55), behavior: "smooth" });
  };

  const chip = (label: string, value: string) => {
    const selected = active === value;
    return (
      <button
        key={value || "__all"}
        type="button"
        onClick={() => onSelect(value)}
        className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
          selected ? "bg-ink text-white" : "text-dim hover:bg-white/80 hover:text-ink"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="relative mt-3 w-full min-w-0 max-w-full">
      {canLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 rounded-l-full bg-gradient-to-r from-fog to-transparent" />
          <button
            type="button"
            aria-label="카테고리 왼쪽 스크롤"
            onClick={() => scrollBy(-1)}
            className="absolute left-1 top-1/2 z-20 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper shadow-sm"
          >
            <ChevronLeft className="size-4" strokeWidth={2.2} />
          </button>
        </>
      )}
      {canRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 rounded-r-full bg-gradient-to-l from-fog to-transparent" />
          <button
            type="button"
            aria-label="카테고리 오른쪽 스크롤"
            onClick={() => scrollBy(1)}
            className="absolute right-1 top-1/2 z-20 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper shadow-sm"
          >
            <ChevronRight className="size-4" strokeWidth={2.2} />
          </button>
        </>
      )}

      <div
        ref={scrollerRef}
        className="no-scrollbar flex w-full min-w-0 max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-full border border-line bg-fog p-1 touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {chip(allLabel, "")}
        {chips.map((c) => chip(c.label, c.key))}
      </div>
    </div>
  );
}
