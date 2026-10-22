"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type AccountUser = {
  name?: string | null;
  email?: string | null;
};

export function AccountSessionCard({ initialUser }: { initialUser?: AccountUser | null }) {
  const { data: clientSession, isPending } = authClient.useSession();
  const user = clientSession?.user ?? initialUser;

  return (
    <div className="mt-3 rounded-2xl bg-ink p-5 text-white" aria-busy={isPending && !initialUser}>
      {user ? (
        <>
          <p className="text-[13px] text-white/70">환영합니다</p>
          <p className="mt-0.5 text-[18px] font-bold">{user.name || user.email}</p>
          {user.email && <p className="mt-1 text-[12px] text-white/60">{user.email}</p>}
          <p className="price mt-3 inline-block rounded-full bg-gold/20 px-3 py-1 text-[12px] font-bold text-gold">
            ✦ Google 연동 계정
          </p>
        </>
      ) : isPending ? (
        <p className="text-[14px] text-white/70">계정 정보를 확인하고 있습니다…</p>
      ) : (
        <>
          <p className="text-[13px] text-white/70">Guest Shopper</p>
          <p className="mt-0.5 text-[18px] font-bold">로그인하고 주문을 추적하세요</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink"
            >
              <LogIn className="size-4" /> Google로 로그인
            </Link>
            <Link
              href="/auth/phone"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-[13px] font-bold text-white"
            >
              휴대폰 로그인
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
