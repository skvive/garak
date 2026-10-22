"use client";

/**
 * 하위 카테고리 칩 — 가로 스크롤(스크롤바 숨김)로는 70여 개 칩 중 일부만 보여서 존재를 알기 어렵다.
 * 두 줄까지만 보여주고 `더보기`로 전체를 펼친다.
 * 선택된 칩은 접힌 상태에서도 보이도록 `전체` 바로 뒤로 당긴다(펼침 상태에서는 원래 순서).
 * — 선택 칩 때문에 자동으로 펼치면 모바일에서 칩 70여 개가 한 화면을 차지해 상품이 밀려난다.
 */
import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

export type ChipItem = { key: string; href: string; label: string; count?: number; active?: boolean };

const CHIP_BASE = "inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors";
const chipCls = (active?: boolean) =>
  `${CHIP_BASE} ${active ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft hover:border-ink/40"}`;

/** 두 줄 높이: 칩 한 줄(≈30px) × 2 + 줄 간격(8px) */
const COLLAPSED_PX = 68;

export function ExpandableChips({ allHref, allActive, items }: { allHref: string; allActive: boolean; items: ChipItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > COLLAPSED_PX + 2);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items.length, open]);

  const ordered = open ? items : [...items.filter((i) => i.active), ...items.filter((i) => !i.active)];

  return (
    <div className="px-4 py-2">
      <div
        ref={ref}
        className="relative flex flex-wrap gap-2 overflow-hidden"
        style={{ maxHeight: open ? undefined : COLLAPSED_PX }}
      >
        <Link href={allHref} className={chipCls(allActive)}>
          전체
        </Link>
        {ordered.map((it) => (
          <Link key={it.key} href={it.href} className={chipCls(it.active)}>
            {it.label}
            {it.count != null && <span className="ml-1 text-[10px] opacity-60">{it.count}</span>}
          </Link>
        ))}
      </div>
      {(overflowing || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-ink-soft hover:border-ink/40"
        >
          {open ? "접기 ▲" : `더보기 (총 ${items.length}개) ▼`}
        </button>
      )}
    </div>
  );
}
