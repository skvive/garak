"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Health = {
  health: string;
  note: string;
  vendorId: string;
  keys: boolean;
  fulfillment: boolean;
  relay: boolean;
  lastError?: string;
};

type Listing = {
  sellerProductId: string;
  vendorItemId: string;
  name: string;
  salePrice?: number;
  quantity?: number;
  status?: string;
  mock?: boolean;
};

type Inquiry = { inquiryId: string; content: string; answered: boolean; createdAt?: string };
type ReturnRow = { receiptId: string; orderId: string; status: string; reason?: string };
type WingSettle = { mock: boolean; note: string; rows: { date?: string; amount?: number; fee?: number }[] };

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const d = await res.json();
  if (!res.ok) throw new Error(d.error ?? "failed");
  return d as T;
}

export function CoupangPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [wing, setWing] = useState<WingSettle | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const loadHealth = useCallback(async (probe = false) => {
    setHealth(await j(`/api/hq/channels/coupang${probe ? "?probe=1" : ""}`));
  }, []);

  const loadOps = useCallback(async () => {
    const [l, i, r, s] = await Promise.all([
      j<{ items: Listing[] }>("/api/hq/channels/coupang?view=listings"),
      j<{ items: Inquiry[] }>("/api/hq/channels/coupang?view=inquiries"),
      j<{ items: ReturnRow[] }>("/api/hq/channels/coupang?view=returns"),
      j<WingSettle>("/api/hq/channels/coupang?view=settlements"),
    ]);
    setListings(l.items ?? []);
    setInquiries(i.items ?? []);
    setReturns(r.items ?? []);
    setWing(s);
  }, []);

  useEffect(() => {
    void loadHealth();
    void loadOps().catch((e) => setMsg(e instanceof Error ? e.message : "load failed"));
  }, [loadHealth, loadOps]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(action);
    setMsg("");
    try {
      const d = await j<{ ok?: number; total?: number }>("/api/hq/channels/coupang", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      setMsg(action === "sync-stock" ? `재고 투영 ${d.ok ?? 0}/${d.total ?? 0}건` : "완료");
      await loadOps();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy("");
    }
  }

  if (!health) return <p className="text-[13px] text-dim">Coupang 상태 확인 중…</p>;
  const live = health.health === "live";

  return (
    <div className="space-y-4 rounded-2xl border border-line p-4 text-[13px] leading-relaxed">
      <p className="font-bold">Coupang · Export 판매처</p>
      <p className="text-[12px] text-dim">
        Wing 일상을 HQ에서 처리합니다. 로켓그로스·광고·빠른정산 신청은 Wing에 남깁니다.
      </p>
      <ul className="space-y-1 text-dim">
        <li>
          상태:{" "}
          <span className={live ? "font-bold text-sage" : "text-coral"}>
            {health.health} · {health.note}
          </span>
        </li>
        <li>vendor: {health.vendorId || "—"}</li>
        {health.lastError && <li className="text-coral">마지막 오류: {health.lastError}</li>}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40" onClick={() => void loadHealth(true).then(() => setMsg("연결 확인 완료"))}>
          Wing API 연결 확인
        </button>
        <button type="button" disabled={!!busy} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold disabled:opacity-40" onClick={() => void act("sync-stock")}>
          CJ 재고 → 쿠팡
        </button>
        <Link href="/hq/products?channel=coupang" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">
          상품 목록
        </Link>
        <Link href="/hq/settlements?channel=coupang" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">
          정산
        </Link>
        <Link href="/hq/pipeline/export" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">
          Export
        </Link>
      </div>

      <div>
        <p className="font-bold">상품 (C2)</p>
        <ul className="mt-2 space-y-2">
          {listings.length === 0 && <li className="text-dim">리스팅 없음</li>}
          {listings.map((row) => (
            <li key={row.sellerProductId} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-1">
              <span className="min-w-0 flex-1">
                {row.name} · qty {row.quantity ?? "—"} · {row.status || "—"}
                {row.mock ? " (목업)" : ""}
              </span>
              {row.vendorItemId && (
                <span className="flex gap-1">
                  <button type="button" disabled={!!busy} className="rounded border border-line px-2 py-1 text-[12px] font-bold" onClick={() => void act("set-qty", { vendorItemId: row.vendorItemId, quantity: 0 })}>
                    품절
                  </button>
                  <button type="button" disabled={!!busy} className="rounded border border-line px-2 py-1 text-[12px] font-bold" onClick={() => void act("stop", { vendorItemId: row.vendorItemId })}>
                    판매중지
                  </button>
                  <button type="button" disabled={!!busy} className="rounded border border-line px-2 py-1 text-[12px] font-bold" onClick={() => void act("resume", { vendorItemId: row.vendorItemId })}>
                    재개
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {wing && (
        <div>
          <p className="font-bold">Wing 정산 30일 (S1)</p>
          <p className="text-[12px] text-dim">{wing.note}{wing.mock ? " · 목업" : ""}</p>
          <ul className="mt-1 text-dim">
            {wing.rows.slice(0, 5).map((r, i) => (
              <li key={i}>{r.date || "—"} · {Number(r.amount ?? 0).toLocaleString()} KRW · fee {Number(r.fee ?? 0).toLocaleString()}</li>
            ))}
            {wing.rows.length === 0 && <li>조회 행 없음</li>}
          </ul>
        </div>
      )}

      <div>
        <p className="font-bold">문의 (Q1)</p>
        <ul className="mt-2 space-y-2">
          {inquiries.length === 0 && <li className="text-dim">미답변 없음</li>}
          {inquiries.map((q) => (
            <li key={q.inquiryId} className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 flex-1">{q.answered ? "답변됨" : "미답"} · {q.content.slice(0, 80)}</span>
              {!q.answered && (
                <button type="button" disabled={!!busy} className="rounded border border-line px-2 py-1 text-[12px] font-bold" onClick={() => void act("reply-inquiry", { inquiryId: q.inquiryId })}>
                  FAQ 답변
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="font-bold">반품 (B3)</p>
        <p className="text-[12px] text-dim">승인 자동화 없음 · 청약철회 1차 응대는 HQ. 처리 확정은 Wing 예외.</p>
        <ul className="mt-2 space-y-1 text-dim">
          {returns.length === 0 && <li>접수 없음</li>}
          {returns.map((r) => (
            <li key={r.receiptId}>
              {r.receiptId} · 주문 {r.orderId} · {r.status} · {r.reason || "—"}
            </li>
          ))}
        </ul>
      </div>

      {msg && <p className="text-[12px] text-dim">{msg}</p>}
    </div>
  );
}
