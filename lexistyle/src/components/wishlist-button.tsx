"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

export function WishlistButton({
  slug,
  size = "sm",
}: {
  slug: string;
  size?: "sm" | "lg";
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d: { slugs?: string[] }) => {
        if (!cancelled) setSaved((d.slugs ?? []).includes(slug));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const prev = saved;
    setSaved(!prev); // 낙관적 업데이트
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 401) {
        setSaved(prev);
        window.location.href = "/auth/sign-in";
        return;
      }
      const data = await res.json();
      if (typeof data.inWishlist === "boolean") setSaved(data.inWishlist);
      else setSaved(prev);
    } catch {
      setSaved(prev);
    } finally {
      setBusy(false);
    }
  }

  const cls = size === "lg" ? "size-9" : "size-4.5";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "위시리스트에서 제거" : "위시리스트에 담기"}
      className="grid place-items-center"
    >
      <Heart
        className={cls}
        strokeWidth={1.8}
        fill={saved ? "currentColor" : "none"}
        color={saved ? "var(--color-coral)" : "currentColor"}
      />
    </button>
  );
}
