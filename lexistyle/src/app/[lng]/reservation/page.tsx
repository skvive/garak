import Link from "next/link";
import { CalendarDays, ShieldCheck } from "lucide-react";

export const metadata = { title: "초장집 예약 안내 | 가락한상" };

export default function ReservationPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <span className="inline-flex rounded-full bg-fog px-3 py-2 text-xs font-bold text-dim">서비스 검증 중</span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink">초장집 예약 안내</h1>
      <p className="mt-4 text-sm leading-7 text-dim">
        가락몰 수산물 구매와 식당 이용을 연결하는 서비스를 준비하고 있습니다.
        현재 참여 식당, 상차림비, 좌석 시간표, 예약 접수 시스템은 운영 확인 전입니다.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-paper p-6">
          <CalendarDays className="size-7 text-sage" />
          <h2 className="mt-4 text-lg font-bold">예약 시스템 연동 전</h2>
          <p className="mt-2 text-sm leading-6 text-dim">실시간 좌석을 조회하거나 예약 완료를 보장할 수 없으므로 온라인 예약 신청은 열지 않았습니다.</p>
        </section>
        <section className="rounded-2xl border border-line bg-paper p-6">
          <ShieldCheck className="size-7 text-sage" />
          <h2 className="mt-4 text-lg font-bold">확인 후 오픈</h2>
          <p className="mt-2 text-sm leading-6 text-dim">실제 식당명·영업시간·상차림비·취소 규정·예약 확인 절차가 마련되면 공개합니다.</p>
        </section>
      </div>
      <Link href="/support" className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
        서비스 문의하기
      </Link>
    </main>
  );
}
