import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/commerce";
import { requireSession } from "@/lib/auth/admin";
import { getAccountOrder } from "@/lib/account/orders";
import { formatKrw, formatUsd, presentOrderStatus } from "@/lib/account/presentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 상세 | My LEXI" };
const STEPS = ["결제 완료", "상품 준비", "배송 중", "배송 완료"];

function trackingStatus(status: string) {
  return ({ requested: "발주 요청", confirmed: "출고 준비", shipped: "배송 중", delivered: "배송 완료", settled: "배송 완료" } as Record<string, string>)[status] ?? status;
}

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const email = session?.user?.email;
  if (!email) {
    return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-[28px] font-semibold">주문 상세</h1><p className="mt-4 text-[14px] leading-7 text-dim">주문 정보를 확인하려면 로그인이 필요합니다.</p><Link href="/auth/sign-in" className="mt-4 inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-bold text-white">로그인하기</Link></main>;
  }
  const { id } = await params;
  const order = await getAccountOrder(email, Number(id));
  if (!order) notFound();
  const status = presentOrderStatus(order.status);
  const itemsSubtotal = order.items.reduce((sum, item) => sum + Number(item.unitPriceUsd) * item.quantity, 0);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" style={{ wordBreak: "keep-all" }}>
      <Link href="/account/orders" className="text-[12px] font-semibold text-dim hover:text-ink">← 주문 · 배송</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[12px] text-dim">{order.createdAt.toLocaleString("ko-KR")} 주문</p><h1 className="mt-1 font-display text-[30px] font-semibold text-ink [text-wrap:balance]">주문 #{order.id}</h1></div><Badge tone={status.tone}>{status.label}</Badge></div>

      <section className="mt-7 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-ink">진행 상황</h2>
        {status.step > 0 ? <ol className="mt-5 grid grid-cols-4 gap-1" aria-label={`현재 ${status.label}`}>{STEPS.map((step, index) => { const number = index + 1; const active = number <= status.step; return <li key={step} className="min-w-0 text-center"><span className={`mx-auto block h-1.5 rounded-full ${active ? "bg-ink" : "bg-line"}`} /><span className={`mt-2 block text-[12px] leading-5 ${number === status.step ? "font-bold text-ink" : "text-dim"}`}>{step}</span></li>; })}</ol> : <p className="mt-3 rounded-2xl bg-fog p-4 text-[13px] leading-6 text-dim">{status.label} 상태입니다.</p>}
      </section>

      <section className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-ink">주문 상품</h2>
        <ul className="mt-4 divide-y divide-line">{order.items.map((item) => <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0"><Link href={`/product/${item.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-fog">{item.image ? <Image src={item.image} alt="" fill sizes="80px" className="object-cover" /> : null}</Link><div className="min-w-0 flex-1"><Link href={`/product/${item.slug}`} className="line-clamp-2 text-[14px] font-semibold leading-6 text-ink hover:underline">{item.title}</Link>{item.option && <p className="mt-1 text-[12px] leading-5 text-dim">옵션 · {item.option}</p>}<div className="mt-2 flex justify-between gap-3 text-[13px]"><span className="text-dim">수량 {item.quantity}</span><span className="font-semibold tabular-nums">{formatUsd(Number(item.unitPriceUsd) * item.quantity)}</span></div></div></li>)}</ul>
      </section>

      {order.tracking.length > 0 && <section className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6"><div className="flex items-center gap-2"><Truck className="size-5 text-sage" /><h2 className="text-[15px] font-bold">배송 조회</h2></div><ul className="mt-4 space-y-3">{order.tracking.map((shipment) => <li key={`${shipment.carrier}:${shipment.trackingNumber}`} className="rounded-2xl bg-fog p-4"><p className="text-[13px] font-bold">{trackingStatus(shipment.status)}</p><p className="mt-1 text-[12px] leading-5 text-dim">{shipment.carrier || "배송사 확인 중"} · 운송장 {shipment.trackingNumber}</p>{shipment.trackUrl && <Link href={shipment.trackUrl} className="mt-2 inline-flex rounded-full bg-ink px-4 py-2 text-[12px] font-bold text-white">배송 추적 보기</Link>}</li>)}</ul><p className="mt-3 text-[12px] leading-5 text-dim">배송 예정일은 확인된 운송 정보가 있을 때만 표시됩니다.</p></section>}

      {order.address && <section className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6"><div className="flex items-center gap-2"><MapPin className="size-5 text-sage" /><h2 className="text-[15px] font-bold">배송지</h2></div><div className="mt-4 text-[13px] leading-7 text-ink">{order.address.name && <p className="font-semibold">{order.address.name}</p>}<p>{[order.address.address1, order.address.city, order.address.postal].filter(Boolean).join(" · ")}</p><p className="text-dim">{[order.address.country, order.address.phone].filter(Boolean).join(" · ")}</p></div></section>}

      <section className="mt-5 rounded-3xl bg-fog p-5 sm:p-6"><div className="flex items-center gap-2"><PackageCheck className="size-5 text-sage" /><h2 className="text-[15px] font-bold">결제 금액</h2></div><dl className="mt-4 space-y-2 text-[13px]"><div className="flex justify-between gap-4"><dt className="text-dim">상품 합계</dt><dd className="tabular-nums">{formatUsd(itemsSubtotal)}</dd></div><div className="flex justify-between gap-4"><dt className="text-dim">배송비</dt><dd className="tabular-nums">{formatUsd(order.shippingUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-dim">관부가세</dt><dd className="tabular-nums">{formatUsd(order.dutyUsd)}</dd></div><div className="mt-3 flex justify-between gap-4 border-t border-line pt-3 text-[16px] font-bold"><dt>최종 결제</dt><dd className="tabular-nums">{formatUsd(order.totalUsd)}</dd></div>{order.amountKrw !== null && <div className="flex justify-between gap-4 text-[12px] text-dim"><dt>원화 승인 금액</dt><dd className="tabular-nums">{formatKrw(order.amountKrw)}</dd></div>}</dl></section>
    </main>
  );
}
