// filepath: src/components/admin/orders-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { ViewToggle, type ViewMode } from "@/components/hq/ViewToggle";

type Order = {
  id: number;
  status: string;
  totalUsd: string;
  country: string | null;
  guestEmail: string | null;
  userEmail: string | null;
  paymentRef: string | null;
  createdAt: string;
};

const STATUSES = ["paid", "preparing", "shipped", "customs", "delivered", "cancelled"];

export function OrdersPanel() {
  const [items, setItems] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  async function load() {
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "로드 실패");
      return;
    }
    setItems(data.items ?? []);
    setMsg(`source: ${data.source}`);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: number, status: string) {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">주문 관리</h2>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>
      <p className="text-[12px] text-dim">{msg}</p>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {items.length === 0 && (
          <li className="p-6 text-[13px] text-dim">주문이 없습니다. Checkout 후 여기에 표시됩니다.</li>
        )}
        {items.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">#{o.id} · ${Number(o.totalUsd).toFixed(2)}</p>
              <p className="text-[12px] text-dim">
                {o.userEmail || o.guestEmail || "guest"} · {o.country} · {o.paymentRef}
              </p>
            </div>
            <select
              className="rounded-lg border border-line px-2 py-1.5 text-[12px]"
              value={o.status}
              onChange={(e) => setStatus(o.id, e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
