"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const LINKS = [
  { href: "/shorts", label: "만들기" },
  { href: "/shorts/dashboard", label: "대시보드" },
  { href: "/shorts#plans", label: "요금" },
];

export function ShortsNav() {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const lng = typeof params.lng === "string" ? params.lng : "ko";
  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${lng}/shorts`} className="text-sm font-bold text-ink">
          CommerceShorts
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => {
            const path = `/${lng}${l.href.split("#")[0]}`;
            const on = l.href === "/shorts" ? pathname === path : pathname.startsWith(path) && l.href !== "/shorts#plans";
            return (
              <Link key={l.href} href={`/${lng}${l.href}`} className={`rounded-full px-3 py-1.5 ${on ? "bg-ink text-white" : "text-dim"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
