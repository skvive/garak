"use client";

import { useEffect, useState } from "react";

export function TimeDealCountdown() {
  const [left, setLeft] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const d = Math.max(0, end.getTime() - now.getTime());
      const h = String(Math.floor(d / 3.6e6)).padStart(2, "0");
      const m = String(Math.floor((d % 3.6e6) / 6e4)).padStart(2, "0");
      const s = String(Math.floor((d % 6e4) / 1e3)).padStart(2, "0");
      setLeft(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="price rounded-lg bg-white/15 px-3 py-1.5 text-[18px] font-bold tabular-nums">{left}</p>
  );
}
