"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreOption } from "@/lib/pdp/storefront-options";

const DIM_NAMES = ["컬러", "사이즈", "옵션"];

/** 상품 하단 구매바 — 옵션 상품은 컬러·사이즈를 고른 뒤에만 담기/바로구매 */
export function ProductBuyBar({ slug, options }: { slug: string; options: StoreOption[] }) {
  const router = useRouter();
  const dimCount = options[0]?.dims.length ?? 0;
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const values = useMemo(
    () => Array.from({ length: dimCount }, (_, i) => [...new Set(options.map((o) => o.dims[i]))]),
    [options, dimCount],
  );
  const selected = dimCount ? options.find((o) => o.dims.every((d, i) => d === picked[i])) : undefined;
  const needsPick = options.length > 0 && !selected;

  async function add(): Promise<boolean> {
    if (needsPick) {
      setMsg(`${DIM_NAMES.slice(0, dimCount).join("·")}를 선택해 주세요`);
      return false;
    }
    setBusy(true);
    setMsg(null);
    try {
      const cur = await fetch("/api/cart").then((r) => r.json());
      const existing = (cur.items as { slug: string; qty: number; variantSku?: string }[] | undefined)?.find(
        (i) => i.slug === slug && (i.variantSku ?? "") === (selected?.sku ?? ""),
      );
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, qty: (existing?.qty ?? 0) + 1, sku: selected?.sku }),
      });
      if (!res.ok) {
        setMsg(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "담기에 실패했습니다");
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 space-y-2">
      {dimCount > 0 && (
        <div className="flex gap-2">
          {values.map((vals, i) => (
            <select
              key={DIM_NAMES[i]}
              aria-label={DIM_NAMES[i]}
              value={picked[i] ?? ""}
              onChange={(e) => {
                const next = [...picked];
                next[i] = e.target.value;
                setPicked(next);
                setMsg(null);
              }}
              className="h-11 flex-1 rounded-xl border border-line bg-white px-3 text-[14px] text-ink"
            >
              <option value="">{DIM_NAMES[i] ?? "옵션"} 선택</option>
              {vals.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
      {msg && <p className="text-[13px] font-semibold text-coral">{msg}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await add()) setMsg("장바구니에 담았습니다");
          }}
          className="flex-1 rounded-xl border border-ink py-3.5 text-[14px] font-bold text-ink hover:bg-fog disabled:opacity-60"
        >
          {busy ? "담는 중…" : "장바구니 담기"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await add()) router.push("/checkout");
          }}
          className="flex-1 rounded-xl bg-ink py-3.5 text-center text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          바로 구매
        </button>
      </div>
    </div>
  );
}
