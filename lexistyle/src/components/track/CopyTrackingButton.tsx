"use client";

import { useState } from "react";

export function CopyTrackingButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* 클립보드 권한이 없으면 번호를 직접 선택해 복사 */
        }
      }}
      className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-fog"
    >
      {done ? "복사됨" : "복사"}
    </button>
  );
}
