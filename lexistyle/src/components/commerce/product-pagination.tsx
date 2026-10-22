import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageHref } from "@/lib/catalog/pagination";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pathname: string;
  query?: Record<string, string | undefined>;
};

function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export function ProductPagination({ page, totalPages, total, pageSize, pathname, query = {} }: Props) {
  if (total <= 0) return null;
  // 1페이지뿐이어도 번호·이전/다음을 같은 형태로 표기 (이전/다음은 비활성)
  totalPages = Math.max(1, totalPages);
  page = Math.min(Math.max(1, page), totalPages);

  const pages = pageWindow(page, totalPages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="상품 페이지" className="mt-10 flex flex-col items-center gap-4 px-4 pb-8">
      <p className="text-[12px] text-dim">
        {from.toLocaleString()}–{to.toLocaleString()} / 총 {total.toLocaleString()}개 · 페이지당 {pageSize}개
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {page > 1 ? (
          <Link
            href={pageHref(pathname, query, page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold hover:bg-fog"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="size-4" />
            이전
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-[13px] text-dim opacity-40">
            <ChevronLeft className="size-4" />
            이전
          </span>
        )}

        {pages.map((p, i) => {
          const prev = pages[i - 1];
          const gap = prev != null && p - prev > 1;
          return (
            <span key={p} className="inline-flex items-center gap-1">
              {gap && <span className="px-1 text-dim">…</span>}
              <Link
                href={pageHref(pathname, query, p)}
                aria-current={p === page ? "page" : undefined}
                className={`grid min-w-9 place-items-center rounded-lg px-2 py-2 text-[13px] font-semibold ${
                  p === page ? "bg-ink text-white" : "border border-line hover:bg-fog"
                }`}
              >
                {p}
              </Link>
            </span>
          );
        })}

        {page < totalPages ? (
          <Link
            href={pageHref(pathname, query, page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold hover:bg-fog"
            aria-label="다음 페이지"
          >
            다음
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-[13px] text-dim opacity-40">
            다음
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
