"use client";

import { useState } from "react";

type Props = {
  lng: string;
  slug: string;
  currentName: string;
  redirectHref: string;
};

export function ProductPageControls({ lng, slug, currentName, redirectHref }: Props) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updateName() {
    const nextName = name.trim();
    if (!nextName || nextName === currentName) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/${lng}/api/admin/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: nextName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "상품명 저장에 실패했습니다.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "상품명 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct() {
    if (!window.confirm("이 상품을 진열에서 삭제할까요? 삭제 후 관리자에서 복구할 수 있습니다.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/${lng}/api/admin/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, softDelete: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "상품 삭제에 실패했습니다.");
      window.location.assign(redirectHref);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "상품 삭제에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-coral/40 bg-coral/5 p-4" aria-label="관리자 상품 관리">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-coral">관리자 상품 관리</p>
      <label className="mt-3 block text-[12px] font-semibold text-dim">
        제품명
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-[14px] text-ink"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void updateName()}
          disabled={busy || !name.trim() || name.trim() === currentName}
          className="rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "저장 중…" : "제품명 저장"}
        </button>
        <button
          type="button"
          onClick={() => void deleteProduct()}
          disabled={busy}
          className="rounded-lg border border-coral px-3 py-2 text-[12px] font-bold text-coral disabled:opacity-40"
        >
          상품 삭제
        </button>
      </div>
      {message && <p className="mt-2 text-[12px] text-coral" role="alert">{message}</p>}
    </section>
  );
}
