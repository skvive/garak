"use client";

/**
 * 카테고리 픽커 — 상위 부서 + 그 아래 CJ 하위 카테고리(진열 상품이 있는 것만) 그리드.
 */
import { useState } from "react";
import Link from "next/link";
import { RailIcon, type IconKey } from "@/components/commerce/rails";
import type { DeptNode } from "@/lib/catalog/category-tree";

const DEPT_ICON: Record<string, IconKey> = {
  beauty: "beauty",
  fashion: "fashion",
  life: "home",
  kids: "kids",
  sports: "sports",
  digital: "tech",
  auto: "auto",
  others: "gift",
};

export function CategoryPicker({ tree, lng }: { tree: DeptNode[]; lng: string }) {
  const visible = tree.filter((d) => d.total > 0);
  const [active, setActive] = useState(visible[0]?.slug ?? "fashion");
  const dept = visible.find((d) => d.slug === active) ?? visible[0];
  if (!dept) return null;
  const icon = DEPT_ICON[dept.slug] ?? "gift";

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="px-4 pb-2 pt-6 font-display text-[22px] font-semibold">카테고리</h1>
      <p className="px-4 pb-3 text-[12px] leading-relaxed text-dim">LEXI 상위 카테고리 · CJ 소싱 하위 카테고리</p>
      <div className="flex min-h-[70dvh]">
        <nav aria-label="부서" className="w-24 shrink-0 border-r border-line bg-fog/40 md:w-40">
          {visible.map((d) => {
            const isActive = d.slug === dept.slug;
            return (
              <button
                key={d.slug}
                type="button"
                onClick={() => setActive(d.slug)}
                className={`block w-full border-l-2 px-3 py-3.5 text-left text-[12.5px] leading-tight transition-colors md:text-[14px] ${
                  isActive ? "border-ink bg-paper font-bold text-ink" : "border-transparent text-dim hover:bg-fog"
                }`}
              >
                {d.label}
                <span className="mt-0.5 block text-[10px] font-normal text-dim">{d.en}</span>
              </button>
            );
          })}
          <Link
            href={`/${lng}/amba`}
            className="block w-full border-l-2 border-transparent px-3 py-3.5 text-left text-[12.5px] leading-tight text-dim transition-colors hover:bg-fog hover:text-ink md:text-[14px]"
          >
            모델들
            <span className="mt-0.5 block text-[10px] font-normal text-dim">AMBA</span>
          </Link>
        </nav>

        <div className="flex-1 px-3 py-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-bold text-ink">
              {dept.label}
              <span className="ml-2 text-[12px] font-normal text-dim">{dept.total.toLocaleString()}개</span>
            </h2>
            <Link href={`/category/${dept.slug}`} className="text-[12px] font-semibold text-dim hover:text-ink">
              전체 보기 →
            </Link>
          </div>

          {dept.children.length === 0 ? (
            <Link
              href={`/category/${dept.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-line bg-fog/50 px-6 py-10 text-center"
            >
              <RailIcon name={icon} size={32} />
              <span className="text-[14px] font-semibold text-ink">{dept.label} 전체</span>
            </Link>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4">
              {dept.children.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/category/${dept.slug}?leaf=${encodeURIComponent(sub.slug)}`}
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <span className="grid size-14 place-items-center rounded-2xl bg-fog transition-colors group-hover:bg-fog-deep">
                    <RailIcon name={icon} size={26} />
                  </span>
                  <span className="line-clamp-2 text-[11.5px] leading-tight text-ink-soft">
                    {sub.name}
                    <span className="ml-1 text-[10px] text-dim/70">{sub.count}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
