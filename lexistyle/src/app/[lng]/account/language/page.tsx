import Link from "next/link";

export const metadata = { title: "언어 · 통화" };

export default function LanguagePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/account" className="text-[12px] font-semibold text-dim hover:text-ink">
        ← My LEXI
      </Link>
      <h1 className="mt-2 font-display text-[28px] font-semibold">언어 · 통화</h1>
      <p className="mt-1 text-[13px] text-dim">현재 스토어 기본값입니다. 계정별 저장은 다음 단계에서 연결됩니다.</p>

      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-ink bg-fog p-4">
          <p className="text-[12px] font-bold text-dim">언어</p>
          <p className="mt-1 text-[15px] font-bold">한국어 (ko)</p>
          <p className="mt-0.5 text-[12px] text-dim">영문(en) PDP 배포 준비 중 · Studio D-008</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[12px] font-bold text-dim">표시 통화</p>
          <p className="mt-1 text-[15px] font-bold">KRW 주표기 + USD 병기</p>
          <p className="mt-0.5 text-[12px] text-dim">결제는 선택 PG에 따라 USD 또는 KRW로 청구</p>
        </div>
      </div>
    </div>
  );
}
