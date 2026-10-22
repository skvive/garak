import Link from "next/link";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { LexiMark } from "@/components/lexi-mark";

const TRUST = [
  { icon: Truck, title: "당일 직배송", desc: "오후 3시 주문, 저녁 6시 전 도착 (반경 10km)" },
  { icon: ShieldCheck, title: "살수율 보증", desc: "살수율 등급 공개, 미달 시 100% 환불" },
  { icon: RotateCcw, title: "캠 캡처 인증", desc: "저울 계량 사진으로 중량을 투명하게 고지" },
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
              <p className="mt-0.5 text-[13px] text-dim">{t.desc}</p>
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
          <nav className="flex gap-4">
            <Link href="/support">고객센터</Link>
            <Link href="/support">배송·반품 안내</Link>
            <Link href="/brands">점포관</Link>
            <Link href="/legal/terms">이용약관</Link>
            <Link href="/legal/privacy" className="font-semibold">개인정보처리방침</Link>
          </nav>
          <p>© 2026 가락한상. 가락시장의 신선함을 집 앞까지.</p>
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
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-dim/80">
            <LexiMark size={14} className="text-dim/70" gap="#f5f5f3" />
            LEXI is the reverse cross-border commerce brand operated by Partners Social Cooperative.
          </p>
        </div>
      </div>
    </footer>
  );
}
