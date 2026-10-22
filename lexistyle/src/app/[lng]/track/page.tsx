import type { Metadata } from "next";
import { TrackLookupForm } from "@/components/track/TrackLookupForm";

export const metadata: Metadata = { title: "배송 조회", robots: { index: false, follow: false } };

export default function TrackLookupPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10" style={{ wordBreak: "keep-all" }}>
      <p className="text-[12px] font-semibold text-dim">LEXI 배송 조회</p>
      <h1 className="mt-1 font-display text-[26px] font-semibold leading-snug text-ink [text-wrap:balance]">주문번호로 배송 상태를 확인하세요</h1>
      <p className="mt-2 text-[13px] leading-6 text-dim">
        쿠팡·LEXI 몰에서 주문하신 상품의 주문번호와 받는 분 성함을 입력하면 해외 배송 진행 상황을 볼 수 있습니다.
      </p>
      <TrackLookupForm />
    </main>
  );
}
