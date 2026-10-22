"use client";

import { useCallback, useEffect, useState } from "react";
import { CJ_INVENTORY_URL } from "@/lib/hq/cj-links";
import type { CjInventoryKind, CjPrivateInventoryRow } from "@/lib/hq/cj-inventory-types";
import { STOCK_ALERT_KO } from "@/lib/catalog/stock-alert";

const KINDS: { id: CjInventoryKind | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "product", label: "상품 재고" },
  { id: "bundle", label: "묶음 프라이빗" },
  { id: "deposit", label: "예치" },
];

export function CjInventoryBoard() {
  const [items, setItems] = useState<CjPrivateInventoryRow[]>([]);
  const [kind, setKind] = useState<CjInventoryKind | "all">("all");
  const [mock, setMock] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setMsg("");
    try {
      const res = await fetch("/api/hq/cj/inventory");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "load failed");
      setItems(json.items ?? []);
      setMock(Boolean(json.mock));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rows = kind === "all" ? items : items.filter((r) => r.kind === kind);
  const fmt = (v: number) => `$${v.toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold">내 재고</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            CJ에서 선매입한 프라이빗·예치 재고. 공개 카탈로그 재고와 다른 원장이다. 평가액은 CJ 대금이며 마진에 더하지 않는다.
            {mock ? " API 미설정 — 목록은 비어 있고 CJ에서 연다." : ""}
          </p>
        </div>
        <a className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white" href={CJ_INVENTORY_URL} target="_blank" rel="noreferrer">
          CJ 인벤토리
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ${kind === k.id ? "bg-ink text-white" : "bg-fog text-dim"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[13px] text-dim">{msg}</p>}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full">
          <thead className="bg-fog">
            <tr>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">SKU</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">상품</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">창고</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">수량</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">평가액</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">경보</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={`${r.sku}-${r.warehouse}`} className="text-[13px] leading-[1.6]">
                <td className="px-2 py-2 font-mono text-[12px]">{r.sku}</td>
                <td className="px-2 py-2">{r.title}</td>
                <td className="px-2 py-2">{r.warehouse}</td>
                <td className="px-2 py-2">{r.qty}</td>
                <td className="px-2 py-2">{fmt(r.valueUsd)}</td>
                <td className="px-2 py-2">{STOCK_ALERT_KO[r.alert]}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[13px] leading-[1.6] text-dim">
                  선매입 재고 없음. CJ에서 프라이빗 인벤토리를 산 뒤 이 화면을 새로고침하세요. 카탈로그 품절 경보와는 별개입니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
