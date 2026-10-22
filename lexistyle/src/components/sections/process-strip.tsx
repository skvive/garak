import { Fish, Camera, Snowflake, Truck } from "lucide-react";

const STEPS = [
  { icon: Fish, title: "새벽 2시 경매", desc: "당일 경매 최상급만 낙찰" },
  { icon: Camera, title: "캠 캡처 검수", desc: "저울 계량 사진 자동 등록" },
  { icon: Snowflake, title: "5℃ 패키징", desc: "가락몰 TC 합배송 포장" },
  { icon: Truck, title: "당일 3시간 배송", desc: "오후 3시 주문 → 저녁 6시 도착" },
];

/**
 * 신뢰 프로세스 스트립 — 삼삼해물식 '산지직송 프로세스'를 4단계로 홈 1-depth 노출.
 */
export function ProcessStrip() {
  return (
    <section aria-label="가락한상 신선 프로세스" className="border-b border-line bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-2 px-4 py-5">
        {STEPS.map((s, i) => (
          <div key={s.title} className="relative flex flex-col items-center gap-1.5 text-center">
            {i < STEPS.length - 1 && (
              <span className="absolute left-[calc(50%+26px)] top-4 hidden h-px w-[calc(100%-52px)] bg-line sm:block" />
            )}
            <span className="grid size-10 place-items-center rounded-full bg-fog text-sage">
              <s.icon className="size-5" strokeWidth={1.8} />
            </span>
            <p className="text-[12px] font-bold text-ink">{s.title}</p>
            <p className="text-[10px] leading-tight text-dim">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
