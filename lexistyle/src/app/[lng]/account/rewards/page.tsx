import Link from "next/link";
import { Crown } from "lucide-react";
import { requireSession } from "@/lib/auth/admin";
import { getAccountRewards } from "@/lib/account/orders";
import { presentTier } from "@/lib/account/presentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "LEXI Rewards | 마이" };

export default async function AccountRewardsPage() {
  const session = await requireSession();
  const email = session?.user?.email;
  if (!email) return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-[28px] font-semibold">LEXI Rewards</h1><p className="mt-4 text-[14px] text-dim"><Link href="/auth/sign-in" className="font-bold text-coral">로그인</Link> 후 리워드 현황을 확인할 수 있습니다.</p></main>;
  const rewards = await getAccountRewards(email);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" style={{ wordBreak: "keep-all" }}>
      <Link href="/account" className="text-[12px] font-semibold text-dim hover:text-ink">← 마이</Link>
      <h1 className="mt-2 font-display text-[30px] font-semibold [text-wrap:balance]">LEXI Rewards</h1>
      <p className="mt-1 text-[14px] leading-6 text-dim">내 계정에 기록된 등급과 포인트입니다.</p>
      <section className="mt-7 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[12px] font-semibold text-white/65">CURRENT TIER</p><p className="mt-2 font-display text-[30px] font-semibold">{rewards ? presentTier(rewards.tier) : "—"}</p></div><span className="grid size-12 place-items-center rounded-full bg-white/10"><Crown className="size-6" strokeWidth={1.5} /></span></div><div className="mt-10 border-t border-white/20 pt-5"><p className="text-[12px] text-white/65">보유 포인트</p><p className="mt-1 text-[26px] font-bold tabular-nums">{(rewards?.points ?? 0).toLocaleString("ko-KR")} P</p></div></section>
      <section className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6"><h2 className="text-[15px] font-bold">리워드 안내</h2><p className="mt-3 text-[13px] leading-7 text-dim">표시된 등급과 포인트는 현재 회원 계정에 저장된 실제 값입니다. 포인트 적립·사용과 등급 산정 정책은 준비 중이며, 적용 기준은 확정 후 이 페이지에서 안내합니다.</p></section>
    </main>
  );
}
