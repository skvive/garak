import Link from "next/link";
import { MessageCircle } from "lucide-react";

export const metadata = { title: "Support" };

const FAQ = [
  { q: "관세는 언제 어떻게 부과되나요?", a: "결제 단계에서 배송 국가 기준 관세를 사전 계산해 총액에 포함합니다. 통관 시 차액이 발생하면 LEXI가 부담합니다." },
  { q: "개인통관고유부호가 왜 필요한가요?", a: "한국(KR)으로 배송할 때 관세청 통관에 필요합니다. 결제 화면에서 P+숫자 12자리 형식으로 입력해 주세요." },
  { q: "배송은 얼마나 걸리나요?", a: "서울 물류센터에서 주문 후 1영업일 내 출고, 주요 국가 기준 4–7영업일 내 도착합니다." },
  { q: "반품은 어떻게 하나요?", a: "수령 후 15일 이내 마이페이지에서 신청하면 무료 회수 라벨이 발급됩니다." },
  { q: "정품이 맞나요?", a: "모든 상품은 브랜드 본사 또는 공식 총판과의 직계약으로 소싱되며 로트별 이력이 관리됩니다." },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-[30px] font-semibold">Support</h1>

      <Link
        href="/support/chat"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-ink bg-ink p-4 text-white transition-opacity hover:opacity-90"
      >
        <span className="grid size-11 place-items-center rounded-full bg-white/10">
          <MessageCircle className="size-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">1:1 채팅상담</span>
          <span className="mt-0.5 block text-[12px] text-white/70">
            배송·통관·반품 문의를 남겨 주세요 · 영업일 24시간 내 답변
          </span>
        </span>
        <span className="text-[13px] font-bold">시작 →</span>
      </Link>

      <h2 className="mt-8 text-[14px] font-bold text-dim">자주 묻는 질문</h2>
      <div className="mt-3 space-y-3">
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-line p-4">
            <summary className="cursor-pointer text-[14px] font-bold">{f.q}</summary>
            <p className="mt-2 text-[13px] leading-relaxed text-dim">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
