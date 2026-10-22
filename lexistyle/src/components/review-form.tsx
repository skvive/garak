"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

export function ReviewForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rating, body }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/sign-in";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      setDone(true);
      setBody("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-sage/10 p-4 text-[13px] font-semibold text-sage">
        리뷰가 등록되었습니다. 감사합니다!
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line p-4">
      <p className="text-[13px] font-bold">리뷰 작성</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n}점`}
            className="p-0.5"
          >
            <Star
              className="size-6"
              fill={n <= rating ? "currentColor" : "none"}
              color={n <= rating ? "var(--color-gold)" : "var(--color-line)"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={1000}
        rows={3}
        placeholder="상품에 대한 솔직한 후기를 남겨주세요"
        className="mt-3 w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-ink"
      />
      {error && <p className="mt-2 text-[12px] text-coral">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="pdp-cta-gradient mt-3 w-full rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
      >
        {pending ? "등록 중…" : "리뷰 등록"}
      </button>
    </form>
  );
}
