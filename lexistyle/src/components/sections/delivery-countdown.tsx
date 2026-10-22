"use client";

import { useEffect, useState } from "react";

/** 다음 오후 3시(주문 마감)까지 남은 시간 */
function timeLeftUntil15() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(15, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/**
 * 당일배송 마감 카운트다운 — 타임 커머스 장치 (디자인 기획서 §2-2).
 * 결제 피크(목/금/토 17~21시) 직전 마감 압박으로 주문을 앞당긴다.
 */
export function DeliveryCountdown() {
  const [label, setLabel] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setLabel(timeLeftUntil15());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-label="당일배송 마감 안내" className="border-b border-line bg-fog">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
        <span aria-hidden className="text-[15px]">🚚</span>
        <span className="font-bold text-ink">오후 3시 주문 마감까지</span>
        <span className="price rounded-lg bg-ink px-2.5 py-1 text-[15px] font-bold tabular-nums text-white">
          {label}
        </span>
        <span className="text-dim">
          · 저녁 6시 전 도착 (강남·서초·송파·강동·위례)
        </span>
        <span className="rounded-full bg-[#2e7d5b]/10 px-2 py-0.5 text-[11px] font-bold text-[#2e7d5b]">
          5℃ 콜드체인 유지
        </span>
      </div>
    </section>
  );
}
