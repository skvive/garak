"use client";

import { useState } from "react";
import { CalendarDays, Clock, Users, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const RESTAURANTS = [
  { id: "maru", name: "초장집 마루", floor: "가락몰 3층", tableFee: 5000, tags: ["수제 하이볼", "콘치즈 명가"] },
  { id: "badajeongwon", name: "바다정원 식당", floor: "가락몰 3층", tableFee: 6000, tags: ["감태 쌈 세트", "프라이빗 룸"] },
  { id: "garak-hae", name: "가락해물탕", floor: "가락몰 3층", tableFee: 4000, tags: ["매운탕 전문", "대용량 룸"] },
];

const DAYS = [
  { id: "today", label: "오늘", sub: "당일" },
  { id: "tomorrow", label: "내일", sub: "예약" },
  { id: "fri", label: "금요일", sub: "회식 추천" },
  { id: "sat", label: "토요일", sub: "주말" },
];

const TIMES = ["11:30", "12:30", "17:00", "18:00", "19:00", "20:00"];

export default function ReservationPage() {
  const [rest, setRest] = useState(RESTAURANTS[0].id);
  const [day, setDay] = useState(DAYS[0].id);
  const [time, setTime] = useState(TIMES[3]);
  const [party, setParty] = useState(4);
  const [done, setDone] = useState(false);

  const selected = RESTAURANTS.find((r) => r.id === rest)!;
  const totalFee = selected.tableFee * party;

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center">
        <CheckCircle2 className="mx-auto size-12 text-fresh" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-[24px] font-semibold">예약 신청 완료</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          {selected.name} · {DAYS.find((d) => d.id === day)?.label} {time} · {party}명
          <br />
          상차림비 {totalFee.toLocaleString("ko-KR")}원은 방문 시 결제됩니다.
          <br />
          1층에서 구매한 회는 식당 도착 전 테이블에 세팅해 드립니다.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-8 rounded-xl bg-ink px-6 py-3 text-[14px] font-bold text-white"
        >
          새 예약 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <h1 className="font-display text-[24px] font-semibold">초장집 예약</h1>
      <p className="mt-1 text-[12px] text-dim">
        1층에서 회를 사고 3층에서 먹는 프리패스 — 회는 미리 테이블에 세팅해 드립니다
      </p>

      {/* 식당 선택 */}
      <h2 className="mb-2 mt-6 text-[13px] font-bold text-dim">1. 식당 선택</h2>
      <div className="space-y-2">
        {RESTAURANTS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRest(r.id)}
            className={`w-full rounded-xl border p-3.5 text-left transition-colors ${rest === r.id ? "border-ink bg-fog" : "border-line"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold">{r.name}</p>
              <p className="text-[12px] text-dim">{r.floor}</p>
            </div>
            <p className="mt-1 text-[12px] text-dim">
              상차림비 인당 {r.tableFee.toLocaleString("ko-KR")}원 · {r.tags.join(" · ")}
            </p>
          </button>
        ))}
      </div>

      {/* 날짜 */}
      <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-[13px] font-bold text-dim">
        <CalendarDays className="size-4" /> 2. 날짜
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {DAYS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDay(d.id)}
            className={`rounded-xl border py-2.5 text-center transition-colors ${day === d.id ? "border-ink bg-fog" : "border-line"}`}
          >
            <span className="block text-[13px] font-bold">{d.label}</span>
            <span className="block text-[10px] text-dim">{d.sub}</span>
          </button>
        ))}
      </div>

      {/* 시간 */}
      <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-[13px] font-bold text-dim">
        <Clock className="size-4" /> 3. 시간
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {TIMES.map((t) => (
          <button
            key={t}
            onClick={() => setTime(t)}
            className={`rounded-xl border py-2 text-[13px] font-bold transition-colors ${time === t ? "border-ink bg-fog" : "border-line"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 인원 */}
      <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-[13px] font-bold text-dim">
        <Users className="size-4" /> 4. 인원
      </h2>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setParty(Math.max(2, party - 1))}
          className="grid size-10 place-items-center rounded-full border border-line text-[18px] font-bold"
        >
          −
        </button>
        <span className="price w-16 text-center text-[20px] font-bold tabular-nums">{party}명</span>
        <button
          onClick={() => setParty(Math.min(20, party + 1))}
          className="grid size-10 place-items-center rounded-full border border-line text-[18px] font-bold"
        >
          +
        </button>
      </div>

      {/* CTA */}
      <button
        onClick={() => setDone(true)}
        className="pdp-cta-gradient mt-8 w-full rounded-xl py-4 text-[16px] font-bold text-white"
      >
        예약 신청 · 상차림비 {totalFee.toLocaleString("ko-KR")}원 (방문 시 결제)
      </button>
      <p className="mt-3 text-center text-[11px] text-dim">
        예약 확정은 가락한상 매니저가 30분 내 연락드립니다 · 취소는 방문 2시간 전까지 무료
      </p>
    </div>
  );
}