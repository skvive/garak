"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  CheckCircle2,
  FileText,
  Film,
  HelpCircle,
  Home,
  Images,
  LayoutDashboard,
  Palette,
  Send,
  ShoppingBag,
  Sparkles,
  Wand2,
} from "lucide-react";
import { LexiMark } from "@/components/lexi-mark";

const CAFE24_ADMIN_URL =
  process.env.NEXT_PUBLIC_CAFE24_ADMIN_URL ?? "https://eclogin.cafe24.com/Shop/";

const NAV = [
  { href: "/studio", label: "개요", icon: LayoutDashboard },
  { href: "/studio/linkrcode", label: "linkrcode", icon: Wand2 },
  { href: "/studio/design/themes", label: "테마", icon: Palette },
  { href: "/studio/design/home", label: "홈 섹션", icon: Home },
  { href: "/studio/creator/library", label: "미디어", icon: Images },
  { href: "/studio/creator/jobs", label: "생성 작업", icon: Sparkles },
  { href: "/studio/creator/pdp", label: "PDP 문서", icon: FileText },
  { href: "/studio/creator/review", label: "승인 큐", icon: CheckCircle2 },
  { href: "/studio/creator/publish", label: "게시·롤백", icon: Send },
  { href: "/studio/cafe24", label: "Cafe24 연결", icon: Blocks },
  { href: "/studio/decisions", label: "결정 대기열", icon: HelpCircle },
] as const;

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-[calc(100dvh-88px)] bg-fog/50">
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[240px_1fr]">
        <aside className="border-r border-line bg-paper px-3 py-5 md:min-h-[calc(100dvh-88px)]">
          <Link href="/studio" className="flex items-center gap-2 px-3">
            <LexiMark size={30} className="text-coral" />
            <div>
              <p className="font-display text-[19px] font-semibold">LEXI Studio</p>
              <p className="text-[10px] font-semibold tracking-wider text-dim">DESIGN & CREATOR</p>
            </div>
          </Link>
          <nav className="mt-6 grid grid-cols-2 gap-1 md:grid-cols-1">
            {NAV.map((item) => {
              const active =
                item.href === "/studio"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                    active ? "bg-ink text-white" : "text-dim hover:bg-fog hover:text-ink"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-5 border-t border-line pt-4">
            <a
              href={CAFE24_ADMIN_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-coral px-3 py-3 text-[13px] font-bold text-white"
            >
              <ShoppingBag className="size-4" />
              Cafe24 쇼핑몰 운영 ↗
            </a>
            <Link
              href="/hq/pipeline/catalog"
              className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-dim hover:bg-fog"
            >
              <Film className="size-4" />
              역직구 Supply 모듈
            </Link>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function StudioPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[30px] font-semibold">{title}</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-dim">{description}</p>
      </div>
      {action}
    </header>
  );
}
