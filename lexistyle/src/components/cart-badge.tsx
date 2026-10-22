// filepath: src/components/cart-badge.tsx
"use client";

import { useEffect, useState } from "react";

export function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCount(d.count ?? 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!count) return null;
  return (
    <span className="price absolute right-1 top-1 grid size-4.5 place-items-center rounded-full bg-coral text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
