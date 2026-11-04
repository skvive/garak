import Link from "next/link";
import { Mail, ShieldCheck, ClipboardCheck } from "lucide-react";

export const metadata = { title: "고객·입점 안내 | 가락한상" };

const FAQ = [
  { q: "현재 상품을 구매할 수 있나요?", a: "현재 실제 입점·상품 이미지·가격·재고 및 결제 연동을 검수하고 있습니다. 승인된 상품에 한하여 판매가 시작됩니다." },
  { q: "광양수산 상품을 주문할 수 있나요?", a: "광양수산 메뉴 기록은 확인했지만 점포 계약 및 현재 판매 여부가 검증되지 않아 37개 상품은 입점대기·비공개입니다." },
  { q: "배송은 얼마나 걸리나요?", a: "아직 확정된 배송 서비스 수준과 요금이 없습니다. 점포별 배송 지역·시간 및 냉장 배송 조건을 확인한 뒤 고지합니다." },
  { q: "원산지와 중량은 어디서 확인하나요?", a: "승인된 각 상품의 상세 정보에서 원산지, 어종, 규격·중량 및 구성과 사진을 확인할 수 있도록 준비 중입니다." },
  { q: "예약이나 정기구독은 가능한가요?", a: "초장집 예약과 홈마카세 구독은 운영 준비 단계입니다. 접수 및 결제 기능을 아직 제공하지 않습니다." },
] as const;

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-xs font-bold tracking-[.17em] text-sage">GARAK HANSANG · HELP</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">고객·입점 안내</h1>
      <p className="mt-3 text-sm leading-7 text-dim">확인된 내용과 준비 중인 서비스를 구분하여 안내합니다.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper p-6">
          <Mail className="size-7 text-sage" />
          <h2 className="mt-4 text-lg font-bold">고객·입점 문의</h2>
          <p className="mt-2 text-sm leading-6 text-dim">파트너스사회적협동조합 · 가락한상</p>
          <a href="mailto:partnersc88@gmail.com" className="mt-4 inline-block text-sm font-semibold text-sage underline underline-offset-4">partnersc88@gmail.com</a>
          <p className="mt-2 text-sm text-dim">010-8482-8545</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-6">
          <ShieldCheck className="size-7 text-sage" />
          <h2 className="mt-4 text-lg font-bold">상품 판매·검수 상태</h2>
          <p className="mt-2 text-sm leading-6 text-dim">실제 상품 촬영·판매 조건과 재고가 확인되어야 신규 구매가 가능합니다.</p>
          <Link href="/#verified-products" className="mt-4 inline-block text-sm font-semibold text-sage underline underline-offset-4">승인 상품 확인하기</Link>
        </div>
      </div>
      <div className="mt-10 flex items-center gap-2">
        <ClipboardCheck className="size-5 text-sage" />
        <h2 className="text-xl font-bold">자주 묻는 질문</h2>
      </div>
      <div className="mt-4 space-y-3">
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-line bg-paper p-4">
            <summary className="cursor-pointer text-sm font-bold">{f.q}</summary>
            <p className="mt-3 text-sm leading-7 text-dim">{f.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
