"use client";

import { useState } from "react";
import { CheckCircle2, Fish, Sparkles, CalendarCheck } from "lucide-react";

const PLANS = [
  {
    id: "biweekly",
    name: "주 2회 · 홈마카세",
    price: 99000,
    per: "회차당",
    desc: "매주 수·금 새벽 경매 직후 큐레이션",
    features: ["제철 활어회 + 곁들임 3종", "주 1회 갑각류·특선", "100g당 단가 시세 그대로"],
    badge: "인기",
  },
  {
    id: "monthly",
    name: "월 1회 · 프리미엄",
    price: 119000,
    per: "회차당",
    desc: "매월 첫째 주 금요일 배송",
    features: ["살수율 A급 보증 구성", "감태·우니 등 시그니처 포함", "와인·사케 페어링 카드"],
    badge: null,
  },
];

const BOX = [
  { icon: Fish, title: "메인", desc: "그날 경매 최상급 회·갑각류" },
  { icon: Sparkles, title: "곁들임", desc: "초장집 소스·쌈채소·안주" },
  { icon: CalendarCheck, title: "정기배송", desc: "당일 3시간 퀵 or 새벽 배송" },
];

export default function SubscriptionPage() {
  const [plan, setPlan] = useState(PLANS[0].id);
  const [done, setDone] = useState(false);
  const selected = PLANS.find((p) => p.id === plan)!;

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center">
        <CheckCircle2 className="mx-auto size-12 text-fresh" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-[24px] font-semibold">구독 신청 완료</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          {selected.name} · 회차당 {selected.price.toLocaleString("ko-KR")}원
          <br />
          첫 배송 구성은 전담 매니저가 전날 확정해 알려드립니다.
          <br />
          언제든 회차 단위로 건너뛰기·해지 가능합니다.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-8 rounded-xl bg-ink px-6 py-3 text-[14px] font-bold text-white"
        >
          다른 플랜 보기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <h1 className="font-display text-[24px] font-semibold">홈마카세 구독</h1>
      <p className="mt-1 text-[12px] text-dim">
        가락시장 최상급 수산·축산·청과를 큐레이션해 정기 배송 — "집에서 즐기는 오마카세"
      </p>

      {/* 플랜 */}
      <div className="mt-6 space-y-3">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id)}
            className={`relative w-full rounded-xl border p-4 text-left transition-colors ${plan === p.id ? "border-ink bg-fog" : "border-line"}`}
          >
            {p.badge && (
              <span className="absolute -top-2 right-4 rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-white">
                {p.badge}
              </span>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[16px] font-bold">{p.name}</p>
              <p className="price text-[18px] font-bold tabular-nums">
                {p.price.toLocaleString("ko-KR")}원
                <span className="ml-1 text-[11px] font-normal text-dim">{p.per}</span>
              </p>
            </div>
            <p className="mt-0.5 text-[12px] text-dim">{p.desc}</p>
            <ul className="mt-2 space-y-0.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <span className="text-fresh">✓</span> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* 구성 */}
      <h2 className="mb-2 mt-8 text-[13px] font-bold text-dim">한 상 구성</h2>
      <div className="grid grid-cols-3 gap-2">
        {BOX.map((b) => (
          <div key={b.title} className="rounded-xl border border-line p-3 text-center">
            <b.icon className="mx-auto size-5 text-sage" strokeWidth={1.8} />
            <p className="mt-1.5 text-[13px] font-bold">{b.title}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-dim">{b.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setDone(true)}
        className="pdp-cta-gradient mt-8 w-full rounded-xl py-4 text-[16px] font-bold text-white"
      >
        구독 시작 · 회차당 {selected.price.toLocaleString("ko-KR")}원
      </button>
      <p className="mt-3 text-center text-[11px] text-dim">
        첫 회차 배송 전 무료 취소 · 이후 회차 단위 건너뛰기 가능 · 결제는 정기결제(토스) 연동 예정
      </p>
    </div>
  );
}