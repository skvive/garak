"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, TrendingUp, ShoppingCart, User } from "lucide-react";
import { CartBadge } from "./cart-badge";

/** 가락한상 5탭 — 홈/오늘시세/한 상/장바구니/마이 (Thumb Zone 내 모든 1차 내비게이션 완결). */
const TABS = [
  { label: "홈", href: "/", icon: Home },
  { label: "시세", href: "/prices", icon: TrendingUp, match: "/prices" },
  { label: "한 상", href: "/category/fashion", icon: LayoutGrid, match: "/category" },
  { label: "장바구니", href: "/cart", icon: ShoppingCart },
  { label: "마이", href: "/account", icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="하단 탭"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.match ?? t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`relative flex flex-col items-center justify-center gap-1 ${
                active ? "text-ink" : "text-dim"
              }`}
            >
              <span className="relative inline-block">
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.7} />
                {t.href === "/cart" && <CartBadge />}
              </span>
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
