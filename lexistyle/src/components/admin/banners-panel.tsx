// filepath: src/components/admin/banners-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { ViewToggle, type ViewMode } from "@/components/hq/ViewToggle";

type Banner = {
  id: number;
  slot: string;
  imageUrl: string;
  headline: string | null;
  href: string | null;
};

export function BannersPanel() {
  const [items, setItems] = useState<Banner[]>([]);
  const [form, setForm] = useState({
    slot: "hero",
    imageUrl: "",
    headline: "",
    href: "/",
  });
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  async function load() {
    const res = await fetch("/api/admin/banners");
    const data = await res.json();
    if (res.ok) setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm((f) => ({ ...f, imageUrl: "", headline: "" }));
    await load();
  }

  async function remove(id: number) {
    await fetch("/api/admin/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">배너 관리</h2>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-line p-4">
        <h2 className="text-[15px] font-bold">배너 등록</h2>
        <label className="text-[12px] font-medium text-dim">
          slot
          <select
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={form.slot}
            onChange={(e) => setForm({ ...form, slot: e.target.value })}
          >
            {["hero", "timedeal", "look"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-medium text-dim">
          imageUrl
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            required
          />
        </label>
        <label className="text-[12px] font-medium text-dim">
          headline
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
          />
        </label>
        <button type="submit" className="rounded-xl bg-ink py-3 text-[14px] font-bold text-white">
          등록
        </button>
      </form>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {items.map((b) => (
          <li key={b.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">
                [{b.slot}] {b.headline || "(no headline)"}
              </p>
              <p className="truncate text-[12px] text-dim">{b.imageUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(b.id)}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px]"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
