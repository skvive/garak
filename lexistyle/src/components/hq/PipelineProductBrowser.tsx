"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { CategoryToggle, type CatalogCategory } from "@/components/hq/CategoryToggle";
import { ViewToggle, type ViewMode } from "@/components/hq/ViewToggle";

/** 그리드 5열 × 2행 = 페이지당 10건 */
export const PIPELINE_GRID_COLS = 5;
export const PIPELINE_GRID_ROWS = 2;
export const PIPELINE_PAGE_SIZE = PIPELINE_GRID_COLS * PIPELINE_GRID_ROWS;

export type PipelineBrowserItem = {
  id: number;
  title: string;
  /** 한글 표기 — 있으면 1줄에 우선 표시 */
  titleKo?: string | null;
  thumbUrl?: string | null;
  /** 예: #1172 · USD 4.39 */
  meta?: string;
  badge?: string;
  /** 우측 보조 배지 (스튜디오 등) */
  cornerBadge?: string;
};

export type PipelineSuggest = {
  id: number;
  title: string;
  titleKo?: string | null;
  thumbUrl?: string | null;
};

type Props = {
  items: PipelineBrowserItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSelectAllVisible: () => void;
  allVisibleSelected: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q?: string) => void;
  /** 자동완성 — 미지정 시 현재 items에서 필터 */
  fetchSuggestions?: (q: string) => Promise<PipelineSuggest[]>;
  categories?: CatalogCategory[];
  selectedCategories?: string[];
  onCategoriesChange?: (next: string[]) => void;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  emptyMessage?: ReactNode;
  toolbar?: ReactNode;
  /** 카드 클릭 시 선택 대신 열기(선택적) */
  selectable?: boolean;
};

export function PipelineProductBrowser({
  items,
  selectedIds,
  onToggle,
  onSelectAllVisible,
  allVisibleSelected,
  viewMode,
  onViewModeChange,
  query,
  onQueryChange,
  onSearch,
  fetchSuggestions,
  categories,
  selectedCategories = [],
  onCategoriesChange,
  page,
  hasMore,
  onPageChange,
  emptyMessage = "표시할 상품이 없습니다.",
  toolbar,
  selectable = true,
}: Props) {
  const listboxId = useId();
  const [openSuggest, setOpenSuggest] = useState(false);
  const [suggests, setSuggests] = useState<PipelineSuggest[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenSuggest(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSuggests([]);
      setOpenSuggest(false);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        if (fetchSuggestions) {
          try {
            const rows = await fetchSuggestions(q);
            setSuggests(rows.slice(0, 8));
            setOpenSuggest(true);
            setActiveIdx(0);
          } catch {
            setSuggests([]);
          }
        } else {
          const needle = q.toLowerCase();
          const rows = items
            .filter(
              (it) =>
                it.title.toLowerCase().includes(needle) ||
                String(it.id).includes(needle) ||
                (it.meta ?? "").toLowerCase().includes(needle),
            )
            .slice(0, 8)
            .map((it) => ({ id: it.id, title: it.title, thumbUrl: it.thumbUrl }));
          setSuggests(rows);
          setOpenSuggest(rows.length > 0);
          setActiveIdx(0);
        }
      })();
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, fetchSuggestions, items]);

  const pickSuggest = (s: PipelineSuggest) => {
    onQueryChange(s.title);
    setOpenSuggest(false);
    onSearch(s.title);
    if (selectable) onToggle(s.id);
  };

  return (
    <div className="space-y-3">
      {categories && onCategoriesChange && (
        <CategoryToggle
          categories={categories}
          selected={selectedCategories}
          onChange={onCategoriesChange}
          layout="hscroll"
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div ref={wrapRef} className="relative min-w-[200px] flex-1">
          <input
            className="w-full rounded-lg border border-line px-3 py-2 text-[13px] leading-relaxed"
            placeholder="검색 (한글명/영문명/카테고리/ID)"
            value={query}
            role="combobox"
            aria-expanded={openSuggest}
            aria-controls={listboxId}
            aria-autocomplete="list"
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (suggests.length) setOpenSuggest(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && openSuggest) {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, Math.max(suggests.length - 1, 0)));
              } else if (e.key === "ArrowUp" && openSuggest) {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (openSuggest && suggests[activeIdx]) pickSuggest(suggests[activeIdx]!);
                else {
                  setOpenSuggest(false);
                  onSearch(query);
                }
              } else if (e.key === "Escape") {
                setOpenSuggest(false);
              }
            }}
          />
          {openSuggest && suggests.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-paper shadow-lg"
            >
              {suggests.map((s, i) => (
                <li key={s.id} role="option" aria-selected={i === activeIdx}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-2 py-2 text-left text-[12px] ${
                      i === activeIdx ? "bg-coral/10" : "hover:bg-fog"
                    }`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pickSuggest(s)}
                  >
                    <span className="size-9 shrink-0 overflow-hidden rounded bg-fog">
                      {s.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.thumbUrl} alt="" className="size-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-medium">{s.titleKo || s.title}</span>
                      <span className="block text-[10px] text-dim">
                        #{s.id}
                        {s.titleKo ? ` · ${s.title}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-line bg-paper px-3 py-2 text-[12px] font-bold"
            onClick={() => onSearch(query)}
          >
            검색
          </button>
          {selectable && (
            <button
              type="button"
              className="rounded-lg border border-line bg-paper px-3 py-2 text-[12px] font-bold"
              onClick={onSelectAllVisible}
            >
              {allVisibleSelected ? "선택 해제" : "전체 선택"}
            </button>
          )}
          {toolbar}
          <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      {viewMode === "list" ? (
        <ul className="max-h-[420px] space-y-1 overflow-auto rounded-xl border border-line bg-paper p-1">
          {items.map((it) => {
            const on = selectedIds.includes(it.id);
            return (
              <li key={it.id}>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-[12px] ${
                    on ? "border-coral bg-coral/5" : "border-transparent hover:bg-fog/60"
                  }`}
                >
                  {selectable && (
                    <input type="checkbox" checked={on} onChange={() => onToggle(it.id)} />
                  )}
                  <span className="size-11 shrink-0 overflow-hidden rounded bg-fog">
                    {it.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumbUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid size-full place-items-center text-[9px] text-dim">—</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 font-medium leading-snug">{it.titleKo || it.title}</span>
                    {it.titleKo ? (
                      <span className="mt-0.5 block line-clamp-1 text-[11px] text-dim">{it.title}</span>
                    ) : null}
                    {(it.meta || it.badge) && (
                      <span className="mt-0.5 block text-[10px] text-dim">
                        {it.meta}
                        {it.badge ? ` · ${it.badge}` : ""}
                      </span>
                    )}
                  </span>
                  {it.cornerBadge && (
                    <span className="shrink-0 rounded bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {it.cornerBadge}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it) => {
            const on = selectedIds.includes(it.id);
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => selectable && onToggle(it.id)}
                  className={`w-full overflow-hidden rounded-xl border text-left transition ${
                    on ? "border-coral ring-2 ring-coral/30" : "border-line bg-paper"
                  }`}
                >
                  <div className="relative aspect-square bg-fog">
                    {it.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumbUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid size-full place-items-center text-[11px] text-dim">이미지 없음</span>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded bg-paper/90 px-1.5 py-0.5 text-[10px] font-bold">
                      #{it.id}
                    </span>
                    {it.cornerBadge && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {it.cornerBadge}
                      </span>
                    )}
                    {on && (
                      <span className="absolute bottom-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-coral text-[12px] font-bold text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 min-h-[2.4em] text-[12px] font-medium leading-snug">
                      {it.titleKo || it.title}
                    </p>
                    {it.titleKo ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-dim">{it.title}</p>
                    ) : null}
                    {it.meta && <p className="mt-0.5 text-[10px] text-dim">{it.meta}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!items.length && (
        <p className="py-8 text-center text-[13px] leading-relaxed text-dim">{emptyMessage}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-dim">
          {viewMode === "grid"
            ? `그리드 ${PIPELINE_GRID_ROWS}행 · 페이지당 ${PIPELINE_PAGE_SIZE}건`
            : `리스트 · 페이지당 ${PIPELINE_PAGE_SIZE}건`}
          {" · "}
          {page + 1}페이지
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
          >
            ← 이전
          </button>
          <button
            type="button"
            disabled={!hasMore}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}
