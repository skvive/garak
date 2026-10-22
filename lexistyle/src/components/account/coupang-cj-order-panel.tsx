"use client";

import { useState } from "react";

export type CoupangCjOrderRow = {
  id: number;
  orderRef: string;
  productTitle: string;
  optionLabel: string;
  qty: number;
  orderStatus: string;
  cjStatus: string;
  cjOrderRef: string | null;
  canSend: boolean;
  createdAt: string;
};

export function CoupangCjOrderPanel({ lng, initialRows }: { lng: string; initialRows: CoupangCjOrderRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<"pull" | "send" | null>(null);
  const [message, setMessage] = useState("");

  async function run(action: "pull" | "send") {
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(`/${lng}/api/account/orders/coupang`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "처리 실패");
      setRows(data.rows ?? []);
      if (action === "pull") {
        setMessage(`쿠팡 주문 ${data.result?.pulled ?? 0}건 조회 · 신건 ${data.result?.created ?? 0}건 저장`);
      } else {
        setMessage(`CJ 전송 ${data.result?.sent ?? 0}건 · 샘플 미러 ${data.result?.sampleMirrors?.created ?? 0}건 · 실패 ${(data.result?.failed ?? 0) + (data.result?.sampleMirrors?.failed ?? 0)}건`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리 실패");
    } finally {
      setBusy(null);
    }
  }

  const sendable = rows.filter((row) => row.canSend).length;
  return (
    <section className="mb-8 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-coral">Coupang → CJ</p>
          <h2 className="mt-1 text-[20px] font-semibold">쿠팡 주문 연동</h2>
          <p className="mt-1 text-[12px] text-dim">매일 09:00·17:00 KST 자동 실행 · CJ 결제 전 주문까지 생성</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("pull")}
            className="rounded-xl border border-line px-4 py-2 text-[13px] font-bold disabled:opacity-50"
          >
            {busy === "pull" ? "조회 중…" : "주문정보조회"}
          </button>
          <button
            type="button"
            disabled={busy !== null || sendable === 0}
            onClick={() => void run("send")}
            className="rounded-xl bg-coral px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy === "send" ? "전송 중…" : `CJ 보내기${sendable ? ` (${sendable})` : ""}`}
          </button>
        </div>
      </div>
      {message && <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-[12px]">{message}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-[12px]">
          <thead className="border-b border-line text-dim">
            <tr>
              <th className="px-2 py-2">쿠팡 주문</th>
              <th className="px-2 py-2">상품·옵션</th>
              <th className="px-2 py-2">수량</th>
              <th className="px-2 py-2">주문 상태</th>
              <th className="px-2 py-2">CJ 상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-5 text-center text-dim">조회된 쿠팡 주문이 없습니다.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-2 py-3 font-semibold">{row.orderRef}</td>
                <td className="max-w-[300px] px-2 py-3">
                  <p className="truncate font-medium">{row.productTitle}</p>
                  <p className="text-dim">{row.optionLabel}</p>
                </td>
                <td className="px-2 py-3">{row.qty}</td>
                <td className="px-2 py-3">{row.canSend ? "신건·전송대기" : row.orderStatus}</td>
                <td className="px-2 py-3">
                  <p>{row.cjStatus}</p>
                  {row.cjOrderRef && <p className="max-w-[160px] truncate text-dim">{row.cjOrderRef}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
