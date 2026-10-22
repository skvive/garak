// filepath: src/components/admin/admin-shell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LexiMark } from "@/components/lexi-mark";

// Cafe24 관리자 대시보드(새 탭). 배포마다 NEXT_PUBLIC_CAFE24_ADMIN_URL 로 덮어쓸 수 있음.
const CAFE24_ADMIN_URL =
  process.env.NEXT_PUBLIC_CAFE24_ADMIN_URL ??
  "https://eclogin.cafe24.com/Shop/";

type Tab = { href: string; label: string; external?: boolean };

const TABS: Tab[] = [
  { href: "/hq", label: "LEXI HQ" },
  { href: "/studio", label: "LEXI Studio" },
  { href: CAFE24_ADMIN_URL, label: "상품·주문·배송 ↗", external: true },
  { href: "/studio/cafe24", label: "Cafe24 연결" },
  { href: "/hq/pipeline/catalog", label: "파이프라인" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-[30px] font-semibold">
            <LexiMark size={34} className="text-dim" />
            LEXI Admin
          </h1>
          <p className="mt-1 text-[13px] text-dim">
            Legacy HQ · 쇼핑몰 원장 운영은 Cafe24, 디자인·콘텐츠는 LEXI Studio
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border border-line bg-fog p-1">
          {TABS.map((t) => {
            const cls = `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              path === t.href ? "bg-ink text-white" : "text-dim hover:text-ink"
            }`;
            // Cafe24 관리자: 새 탭으로 외부 대시보드 열기
            if (t.external) {
              return (
                <a key={t.href} href={t.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {t.label}
                </a>
              );
            }
            return (
              <Link key={t.href} href={t.href} className={cls}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
