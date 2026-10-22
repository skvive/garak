export function UtilityStrip() {
  return (
    <div className="flex h-8 items-center justify-center gap-2 bg-ink text-[12px] font-medium text-white">
      <span aria-hidden>🦀</span>
      <span>
        반경 10km <span className="price font-bold">당일 3시간 배송</span> — 오늘 가락시장 경매 시세 그대로
      </span>
      <span className="text-white/40">·</span>
      <span className="text-white/70">살수율 보증 · 캠 캡처 인증</span>
    </div>
  );
}
