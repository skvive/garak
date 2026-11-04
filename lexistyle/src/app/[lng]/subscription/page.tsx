import Link from "next/link";
import { Fish, ClipboardCheck } from "lucide-react";

export const metadata = { title: "홈마카세 구독 안내 | 가락한상" };

export default function SubscriptionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <span className="inline-flex rounded-full bg-fog px-3 py-2 text-xs font-bold text-dim">구독 상품 준비 중</span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink">홈마카세 구독 안내</h1>
      <p className="mt-4 text-sm leading-7 text-dim">
        제철 회·해산물을 정기적으로 소개하는 구독 상품을 기획하고 있습니다.
        현재 요금제, 배송일, 공급 상인 및 정기결제는 확정된 운영 서비스가 아닙니다.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-paper p-6">
          <Fish className="size-7 text-sage" />
          <h2 className="mt-4 text-lg font-bold">제철 메뉴 검토</h2>
          <p className="mt-2 text-sm leading-6 text-dim">어종, 가격, 중량, 손질 옵션과 제철 공급 가능 여부를 점포와 확인합니다.</p>
        </section>
        <section className="rounded-2xl border border-line bg-paper p-6">
          <ClipboardCheck className="size-7 text-sage" />
          <h2 className="mt-4 text-lg font-bold">정기배송 운영 준비</h2>
          <p className="mt-2 text-sm leading-6 text-dim">결제·배송·해지·환불 정책과 고객 지원 절차가 준비된 후 신청을 받습니다.</p>
        </section>
      </div>
      <p className="mt-6 text-xs leading-6 text-dim">현재 온라인 신청 및 결제는 진행되지 않습니다. 화면만으로 신청이 완료되었다고 안내하지 않습니다.</p>
      <Link href="/support" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
        서비스 문의하기
      </Link>
    </main>
  );
}
