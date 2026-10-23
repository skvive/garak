import Image from "next/image";
import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/commerce";
import { isAdminEmail, requireSession } from "@/lib/auth/admin";
import { CoupangCjOrderPanel } from "@/components/account/coupang-cj-order-panel";
import { GuestCjTracking } from "@/components/account/guest-cj-tracking";
import { listChannelOrderQueue } from "@/lib/hq/services";
import { listAccountOrders } from "@/lib/account/orders";
import { formatUsd, presentOrderStatus } from "@/lib/account/presentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 · 배송 | 가락한상" };

export default async function AccountOrdersPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const session = await requireSession();
  const email = session?.user?.email;
  if (!email) {
    return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-[28px] font-semibold">주문 · 배송</h1><GuestCjTracking lng={lng} /><p className="mt-6 text-[14px] leading-7 text-dim">내 주문 내역을 확인하려면 로그인해 주세요.</p><Link href="/auth/sign-in" className="mt-4 inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-bold text-white">로그인하기</Link></main>;
  }
  const rows = await listAccountOrders(email);
  const isAdmin = isAdminEmail(email);
  const coupangRows = isAdmin ? await listChannelOrderQueue("coupang") : [];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" style={{ wordBreak: "keep-all" }}>
      <Link href="/account" className="text-[12px] font-semibold text-dim hover:text-ink">← 마이</Link>
      <div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="font-display text-[30px] font-semibold text-ink [text-wrap:balance]">주문 · 배송</h1><p className="mt-1 text-[14px] leading-6 text-dim">결제부터 배송 완료까지 주문별 진행 상황을 확인하세요.</p></div><p className="shrink-0 text-[13px] font-semibold tabular-nums text-dim">총 {rows.length}건</p></div>
      <GuestCjTracking lng={lng} />
      {isAdmin && <div className="mt-6"><CoupangCjOrderPanel lng={lng} initialRows={coupangRows} /></div>}
      {rows.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-line bg-fog px-6 py-12 text-center"><PackageOpen className="mx-auto size-8 text-dim" strokeWidth={1.4} /><h2 className="mt-4 text-[16px] font-bold text-ink">아직 주문 내역이 없습니다</h2><p className="mt-1 text-[13px] leading-6 text-dim">LEXI가 고른 새로운 셀렉션을 둘러보세요.</p><Link href="/best" className="mt-5 inline-flex rounded-full bg-ink px-5 py-3 text-[13px] font-bold text-white">베스트 상품 보기</Link></section>
      ) : (
        <ol className="mt-7 space-y-4">
          {rows.map((order) => {
            const status = presentOrderStatus(order.status);
            const lead = order.items[0];
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id}><Link href={`/account/orders/${order.id}`} className="group block rounded-3xl border border-line bg-paper p-4 transition-colors hover:bg-fog sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-line pb-3"><div><p className="text-[12px] leading-5 text-dim">{order.createdAt.toLocaleDateString("ko-KR")} · 주문 #{order.id}</p><div className="mt-1"><Badge tone={status.tone}>{status.label}</Badge></div></div><ChevronRight className="size-5 text-dim transition-transform group-hover:translate-x-0.5" /></div>
                <div className="mt-4 flex gap-4"><div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-fog">{lead?.image ? <Image src={lead.image} alt="" fill sizes="80px" className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-[14px] font-semibold leading-6 text-ink">{lead?.title ?? "주문 상품"}</p>{lead?.option && <p className="mt-1 text-[12px] leading-5 text-dim">{lead.option}</p>}<div className="mt-3 flex items-end justify-between gap-3"><p className="text-[12px] text-dim">{itemCount}개 상품</p><p className="text-[16px] font-bold tabular-nums text-ink">{formatUsd(order.totalUsd)}</p></div></div></div>
              </Link></li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
