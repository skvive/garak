"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, ShoppingBag } from "lucide-react";
import { UtilityStrip } from "./utility-strip";
import { UserMenu } from "./user-menu";
import { CartBadge } from "./cart-badge";
import { LanguageSwitcher } from "./language-switcher";
import { CoupangSyncButton } from "./coupang-sync-button";

const GNB = [
  { label: "오늘시세", href: "/best" },
  { label: "수산", href: "/category/beauty" },
  { label: "한 상", href: "/category/fashion" },
  { label: "축산", href: "/category/life" },
  { label: "청과", href: "/category/kids" },
  { label: "초장집", href: "/category/others" },
  { label: "점포관", href: "/brands" },
];

export function SiteHeader() {
  return (
    <>
      <UtilityStrip />
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-[24px] font-bold tracking-tight">
            가락<span className="text-coral">한상</span>
          </Link>

          <nav className="hidden gap-7 md:flex" aria-label="주 메뉴">
            {GNB.map((m) => (
              <Link
                key={m.label}
                href={m.href}
                className={`text-[15px] font-medium transition-colors hover:text-coral ${
                  m.label === "오늘시세" ? "text-coral" : "text-ink"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <CoupangSyncButton />
            <LanguageSwitcher />
            <UserMenu />
            <Link href="/search" aria-label="검색" className="hidden size-11 place-items-center rounded-full hover:bg-fog md:grid">
              <Search className="size-[22px]" strokeWidth={1.7} />
            </Link>
            <Link href="/account/wishlist" aria-label="위시리스트" className="hidden size-11 place-items-center rounded-full hover:bg-fog md:grid">
              <Heart className="size-[22px]" strokeWidth={1.7} />
            </Link>
            <Link href="/cart" aria-label="장바구니" className="relative grid size-11 place-items-center rounded-full hover:bg-fog">
              <ShoppingBag className="size-[22px]" strokeWidth={1.7} />
              <CartBadge />
            </Link>
          </div>
        </div>

        {/* 모바일 전용 인라인 검색바 — docs/lexi-mobile-ui-spec.md §C-SearchBar */}
        <form action="/search" className="border-t border-line px-4 py-2.5 md:hidden">
          <label className="flex items-center gap-2.5 rounded-full bg-fog px-4 py-2.5">
            <Search className="size-4 shrink-0 text-dim" strokeWidth={2} />
            <input
              type="search"
              name="q"
              placeholder="브랜드, 상품, #LEXILOOK 검색"
              className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim"
            />
          </label>
        </form>
      </header>
    </>
  );
}
