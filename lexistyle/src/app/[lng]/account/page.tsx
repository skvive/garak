// filepath: src/app/account/page.tsx
import Link from "next/link";
import {
  Package,
  Heart,
  Shirt,
  Crown,
  Star,
  Settings,
  ChevronRight,
  Bell,
  Headset,
  Globe,
  Truck,
  RotateCcw,
  Percent,
} from "lucide-react";
import { requireSession, requireAdmin } from "@/lib/auth/admin";
import { AccountSessionCard } from "@/components/account-session-card";
import { getAccountRewards } from "@/lib/account/orders";
import { presentTier } from "@/lib/account/presentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "마이 | 가락한상" };

export default async function AccountPage() {
  const session = await requireSession();
  const admin = await requireAdmin();
  const user = session?.user;
  const rewards = user?.email ? await getAccountRewards(user.email) : null;

  const MENU = [
    { icon: Package, label: "주문 / 배송 추적", href: "/account/orders", meta: user ? undefined : "로그인 권장" },
    { icon: Heart, label: "위시리스트", href: "/account/wishlist" },
    { icon: Shirt, label: "복합 한 상", href: "/category/fashion" },
    { icon: Crown, label: "한상 리워드", href: "/account/rewards", meta: rewards ? presentTier(rewards.tier) : undefined },
    { icon: Star, label: "내 리뷰", href: "/account/reviews", meta: "주문 후 작성" },
    { icon: Bell, label: "알림", href: "/account/notifications" },
    { icon: Headset, label: "고객센터", href: "/support" },
    { icon: Globe, label: "언어", href: "/account/language" },
    { icon: Settings, label: "계정 설정", href: "/account/settings" },
  ];

  /** 가락한상 신뢰 혜택 3종 — 실제 운영 정책만 채용 */
  const BENEFITS = [
    { icon: Truck, title: "당일 3시간 배송", desc: "오후 3시 주문 → 저녁 6시 도착" },
    { icon: RotateCcw, title: "살수율 보증", desc: "미달 시 100% 환불" },
    { icon: Percent, title: "캠 캡처 인증", desc: "저울 계량 사진으로 중량 고지" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-[30px] font-semibold">마이</h1>
      <AccountSessionCard initialUser={user} />

      {admin && (
        <Link
          href="/hq"
          className="mt-4 flex items-center justify-between rounded-2xl border-2 border-ink bg-paper px-4 py-3.5 hover:bg-fog"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-dim">Admin</p>
            <p className="text-[15px] font-bold">가락한상 HQ · 홈</p>
          </div>
          <ChevronRight className="size-5" />
        </Link>
      )}

      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
        {MENU.map((m) => (
          <li key={m.label}>
            <Link href={m.href} className="flex items-center gap-3.5 p-4 hover:bg-fog">
              <m.icon className="size-5 text-dim" strokeWidth={1.7} />
              <span className="flex-1 text-[14px] font-medium">{m.label}</span>
              {m.meta && <span className="text-[12px] font-semibold text-dim">{m.meta}</span>}
              <ChevronRight className="size-4 text-dim" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl bg-fog p-4">
        <p className="mb-3 text-[12px] font-bold text-dim">가락한상 쇼핑 혜택</p>
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper">
                <b.icon className="size-4 text-sage" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{b.title}</p>
                <p className="text-[11px] text-dim">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
