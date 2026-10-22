"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HQ_NAV } from "@/lib/hq/nav";

export function HqTopbar({
  email,
  dbMode,
}: {
  email?: string | null;
  dbMode: "neon" | "local-file" | "memory";
}) {
  const path = usePathname();
  const current = HQ_NAV.flatMap((s) => s.items).find((item) => {
    if (item.external) return false;
    if (item.href === "/hq") return path === "/hq";
    return path === item.href || path.startsWith(`${item.href}/`);
  });

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:px-6">
      <div>
        <p className="text-[11px] font-bold text-dim">LEXI HQ</p>
        <p className="text-[15px] font-semibold">{current?.label ?? "홈"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span
          className={`rounded-full px-2.5 py-1 font-bold ${
            dbMode === "neon" ? "bg-sage/15 text-sage" : "bg-fog text-dim"
          }`}
        >
          {dbMode === "neon" ? "Neon DB" : dbMode === "local-file" ? "로컬 파일 DB" : "메모리"}
        </span>
        {email ? (
          <span className="rounded-full border border-line px-2.5 py-1 font-medium text-dim">{email}</span>
        ) : (
          <Link href="/auth/sign-in?next=/hq" className="rounded-full bg-coral px-3 py-1 font-bold text-white">
            로그인
          </Link>
        )}
        <Link href="/" className="rounded-full border border-line px-2.5 py-1 font-medium text-dim hover:text-ink">
          스토어 ←
        </Link>
      </div>
    </header>
  );
}
