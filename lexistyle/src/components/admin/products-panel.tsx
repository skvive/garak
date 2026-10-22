// filepath: src/components/admin/products-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { ViewToggle, type ViewMode } from "@/components/hq/ViewToggle";

type Item = {
  id?: number;
  slug: string;
  name: string;
  priceUsd?: string | number;
  price?: number;
  discountRate: number;
  stock?: number;
  brand: string;
  category?: string;
};

export function ProductsPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    brand: "SEOULINE",
    category: "beauty",
    priceUsd: 29,
    discountRate: 0,
    stock: 50,
    imageUrl: "",
  });
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  async function load() {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "로드 실패 — 로그인 필요");
      return;
    }
    setItems(data.items ?? []);
    setMsg(`source: ${data.source}`);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "생성 실패");
      return;
    }
    setForm((f) => ({ ...f, slug: "", name: "", imageUrl: "" }));
    await load();
  }

  async function softDelete(id: number) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, softDelete: true }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">상품 관리</h2>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>
      <p className="text-[12px] text-dim">{msg}</p>
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-line p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-[15px] font-bold">상품 등록</h2>
        {(
          [
            ["slug", "slug"],
            ["name", "상품명"],
            ["brand", "브랜드"],
            ["imageUrl", "이미지 URL"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-[12px] font-medium text-dim">
            {label}
            <input
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px] text-ink"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={key !== "imageUrl"}
            />
          </label>
        ))}
        <label className="text-[12px] font-medium text-dim">
          카테고리
          <select
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px]"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {["beauty", "fashion", "life", "kids", "others"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-medium text-dim">
          가격 USD
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px]"
            value={form.priceUsd}
            onChange={(e) => setForm({ ...form, priceUsd: Number(e.target.value) })}
          />
        </label>
        <button type="submit" className="md:col-span-2 rounded-xl bg-ink py-3 text-[14px] font-bold text-white">
          등록
        </button>
      </form>

      <ul className="divide-y divide-line rounded-2xl border border-line">
        {items.map((p) => (
          <li key={p.slug + String(p.id ?? "")} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-dim">{p.brand}</p>
              <p className="truncate text-[14px] font-medium">{p.name}</p>
              <p className="price text-[13px] text-dim">
                ${Number(p.priceUsd ?? p.price ?? 0).toFixed(2)} · {p.slug}
                {p.stock !== undefined ? ` · stock ${p.stock}` : ""}
              </p>
            </div>
            {p.id !== undefined && (
              <button
                type="button"
                onClick={() => softDelete(p.id!)}
                className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-dim hover:border-coral hover:text-coral"
              >
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
