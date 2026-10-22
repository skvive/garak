import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import type { ProductSort } from "@/lib/catalog";
import { USD_KRW } from "@/lib/format";

/** 실제로 동작하는 정렬만 노출 — 리뷰·할인 데이터가 쌓이기 전에는 의미 없는 정렬을 보여주지 않는다 */
export const SORT_OPTIONS: Array<{ key: ProductSort; label: string }> = [
  { key: "default", label: "신상품순" },
  { key: "price-asc", label: "낮은 가격순" },
  { key: "price-desc", label: "높은 가격순" },
];

export type ListQuery = { sort?: string; pmin?: string; pmax?: string; sale?: string; q?: string; leaf?: string; bucket?: string };

const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((o) => o.key));

export function parseSort(raw?: string): ProductSort {
  return raw && SORT_KEYS.has(raw) ? (raw as ProductSort) : "default";
}

/** 원화 입력 → USD 원장 범위 */
export function parsePriceRange(pmin?: string, pmax?: string): { priceMin?: number; priceMax?: number } {
  const toUsd = (v?: string) => {
    const n = Number((v ?? "").replace(/[^0-9.]/g, ""));
    return v && Number.isFinite(n) && n > 0 ? +(n / USD_KRW).toFixed(2) : undefined;
  };
  return { priceMin: toUsd(pmin), priceMax: toUsd(pmax) };
}

function hrefWith(pathname: string, query: ListQuery, patch: Partial<ListQuery>) {
  const merged: Record<string, string | undefined> = { ...query, ...patch, page: undefined };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const chip = (active: boolean) =>
  `inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
    active ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft hover:border-ink/40"
  }`;

/** 정렬 칩 + 가격·할인 필터 패널 (서버 렌더, JS 없이 GET 폼으로 동작) */
export function SortFilterBar({ pathname, query, showSale = false }: { pathname: string; query: ListQuery; showSale?: boolean }) {
  const active = parseSort(query.sort);
  const activeFilters = [query.pmin, query.pmax, query.sale].filter(Boolean).length;
  const hidden = Object.entries({ q: query.q, leaf: query.leaf, bucket: query.bucket, sort: query.sort }).filter(([, v]) => v);

  return (
    <div className="flex items-start justify-between gap-2 px-4 py-2">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SORT_OPTIONS.map((o) => (
          <Link
            key={o.key}
            href={hrefWith(pathname, query, { sort: o.key === "default" ? undefined : o.key })}
            className={chip(o.key === active)}
            aria-current={o.key === active ? "true" : undefined}
          >
            {o.label}
          </Link>
        ))}
      </div>
      <details className="group relative shrink-0">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft marker:content-none">
          <SlidersHorizontal className="size-3.5" />
          필터
          {activeFilters > 0 && (
            <span className="ml-0.5 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">{activeFilters}</span>
          )}
        </summary>
        <form
          action={pathname}
          method="get"
          className="absolute right-0 z-30 mt-2 w-72 space-y-3 rounded-2xl border border-line bg-paper p-4 shadow-lg"
        >
          {hidden.map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <fieldset>
            <legend className="text-[12px] font-bold text-ink">가격 (원)</legend>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                name="pmin"
                min={0}
                step={1000}
                defaultValue={query.pmin}
                placeholder="최소"
                className="w-full rounded-lg border border-line bg-fog px-2.5 py-2 text-[13px] outline-none"
              />
              <span className="text-dim">~</span>
              <input
                type="number"
                inputMode="numeric"
                name="pmax"
                min={0}
                step={1000}
                defaultValue={query.pmax}
                placeholder="최대"
                className="w-full rounded-lg border border-line bg-fog px-2.5 py-2 text-[13px] outline-none"
              />
            </div>
          </fieldset>
          {showSale && (
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" name="sale" value="1" defaultChecked={query.sale === "1"} className="size-4" />
              할인 상품만
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-paper">
              적용
            </button>
            <Link
              href={hrefWith(pathname, query, { pmin: undefined, pmax: undefined, sale: undefined })}
              className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-ink-soft"
            >
              초기화
            </Link>
          </div>
        </form>
      </details>
    </div>
  );
}
