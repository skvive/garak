import Link from "next/link";
import { ShieldCheck, ClipboardCheck, Truck } from "lucide-react";
import { LexiMark } from "@/components/lexi-mark";

const TRUST = [
  { icon: ClipboardCheck, title: "점포 정보 확인", desc: "현장 조사 기록과 실제 영업·입점 승인 상태를 구분해 안내합니다." },
  { icon: ShieldCheck, title: "상품 검수 기준", desc: "어종·원산지·중량·상품 이미지를 검토한 상품만 판매 대상으로 등록합니다." },
  { icon: Truck, title: "배송 조건 확인", desc: "점포별 실제 배송 가능 지역과 소요 시간·요금은 확인 후 고지합니다." },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-fog">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        {TRUST.map((t) => (
          <div key={t.title} className="flex items-start gap-3">
            <t.icon className="mt-0.5 size-6 shrink-0 text-sage" strokeWidth={1.6} />
            <div>
              <p className="text-[14px] font-bold">{t.title}</p>
              <p className="mt-0.5 text-[13px] leading-6 text-dim">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[12px] text-dim">
          <p className="flex items-center gap-2 font-display text-[18px] font-semibold text-ink">
            <LexiMark size={26} className="text-dim" gap="#f5f5f3" />
            가락<span className="text-coral">한상</span>
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/prices">시세·점포 안내</Link>
            <Link href="/reservation">초장집 서비스</Link>
            <Link href="/subscription">홈마카세 준비 현황</Link>
            <Link href="/support">고객 안내</Link>
            <Link href="/legal/terms">이용약관</Link>
            <Link href="/legal/privacy" className="font-semibold">개인정보처리방침</Link>
          </nav>
          <p>© 2026 가락한상.</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-[12px] leading-relaxed text-dim">
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <span>파트너스사회적협동조합 (가락한상)</span>
            <span>대표 강준철</span>
            <span>사업자등록번호 589-82-00469</span>
          </p>
          <p className="mt-1">서울특별시 송파구 새말로 15길 16-8, 101호</p>
          <p className="mt-1">이메일 partnersc88@gmail.com · Tel 010-8482-8545</p>
          <p className="mt-2">구체적인 입점 상품·배송·환불 조건은 서비스별 확인 후 안내합니다.</p>
        </div>
      </div>
    </footer>
  );
}
