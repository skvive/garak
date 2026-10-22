"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { channelLabel, channelPill } from "@/lib/hq/channel-ui";
import { inboxStageLabel, type PurchaseInboxRow } from "@/lib/hq/inbox-types";
import { CJ_KIND_TABS, CJ_ORDER_TABS, cjDisputeUrl, isCjUnpaid, trackingPageUrl, type CjOrderKind, type CjOrderTab } from "@/lib/hq/cj-order";
import type { CjWalletSnapshot } from "@/lib/hq/cj-order";
import { CjMoneyStrip } from "./CjMoneyStrip";
import type { DisputeDraftRecord } from "@/lib/hq/services";

const VIEW_KEY = "lexi-hq-sourcing-view";
const NEXT_KO: Record<string, string> = {
  confirmed: "발주확인",
  shipped: "출고",
  delivered: "배송완료→정산",
};

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api/hq${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

export function SourcingOrdersBoard() {
  const [orders, setOrders] = useState<PurchaseInboxRow[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [disputes, setDisputes] = useState<
    { soId: number; disputeId?: string; orderRef?: string; product: string; draft?: DisputeDraftRecord }[]
  >([]);
  const [logistics, setLogistics] = useState<string[]>([]);
  const [money, setMoney] = useState<CjWalletSnapshot | null>(null);
  const [kind, setKind] = useState<CjOrderKind>("wholesale");
  const [tab, setTab] = useState<CjOrderTab>("all");
  const [q, setQ] = useState("");
  const [undelivered, setUndelivered] = useState(false);
  const [logistic, setLogistic] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ kind, tab });
      if (q.trim()) params.set("q", q.trim());
      if (undelivered) params.set("undelivered", "1");
      if (logistic) params.set("logistic", logistic);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await api(`/sourcing-orders?${params}`);
      setOrders((data.orders as PurchaseInboxRow[]) ?? []);
      setTabCounts((data.tabCounts as Record<string, number>) ?? {});
      setDisputes(data.disputes ?? []);
      setLogistics((data.logistics as string[]) ?? []);
      const wallet = await api("/cj/money").catch(() => null);
      if (wallet) setMoney(wallet as CjWalletSnapshot);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    }
  }, [kind, tab, q, undelivered, logistic, from, to]);

  useEffect(() => { void load(); }, [load]);

  const advance = async (soId: number, next: string) => {
    setMsg("");
    try {
      await api(`/sourcing-orders/${soId}`, "PATCH", { to: next });
      setMsg(next === "delivered" ? `배송완료 · 정산 원장 생성 SO#${soId}` : `${NEXT_KO[next]} SO#${soId}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  const pullReturns = async () => {
    setMsg("");
    try {
      const r = (await api("/channels/coupang", "POST", { action: "pull-returns" })) as { returns: number; drafted: unknown[] };
      setMsg(`쿠팡 환불요청 ${r.returns}건 확인 · CJ 분쟁 준비 ${r.drafted.length}건 (접수 전)`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "pull returns failed");
    }
  };

  const confirm = async (soId: number) => {
    setMsg("");
    try {
      await api(`/sourcing-orders/${soId}/confirm`, "POST", {});
      setMsg(`CJ 주문 확정 SO#${soId} — 결제대기`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "confirm failed");
    }
  };

  const pay = async (soId: number) => {
    setMsg("");
    try {
      await api(`/sourcing-orders/${soId}/pay`, "POST", {});
      setMsg(`잔액결제 요청 SO#${soId}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "pay failed");
    }
  };

  const sync = async () => {
    setMsg("");
    try {
      const r = await api("/sourcing-orders/sync", "POST", {});
      setMsg(`CJ 동기화 ${r.matched ?? 0}건`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "sync failed");
    }
  };

  const markUndelivered = async (soId: number, value: boolean) => {
    await api(`/sourcing-orders/${soId}`, "PATCH", { undelivered: value });
    await load();
  };

  const btn = "rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-bold text-white";
  const ghost = "rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold";
  const fmt = (v?: number) => (v == null ? "—" : `$${v.toFixed(2)}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold">소싱발주</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            CJ 발주 상태(API)가 권위. 판매채널 주문은 구매요청. 마진 정산은 배송완료 후 별 장부.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => void sync()}>CJ 동기화</button>
          <ViewToggle
            viewMode={viewMode}
            onChange={(m) => {
              setViewMode(m);
              try { localStorage.setItem(VIEW_KEY, m); } catch { /* ignore */ }
            }}
          />
          <Link href="/hq/purchase-requests" className={ghost}>구매요청</Link>
        </div>
      </div>

      <CjMoneyStrip money={money} />

      <div className="flex flex-wrap gap-2">
        {CJ_KIND_TABS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id as CjOrderKind)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ${kind === k.id ? "bg-ink text-white" : "bg-fog text-dim"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {CJ_ORDER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ${tab === t.id ? "bg-ink text-white" : "bg-fog text-dim"}`}
          >
            {t.label} ({tabCounts[t.id] ?? 0})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="주문번호 / SKU / 상품명"
          className="min-w-[200px] flex-1 rounded-lg border border-line px-3 py-2 text-[13px]"
        />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-[13px]" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-[13px]" />
        <select value={logistic} onChange={(e) => setLogistic(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-[13px]">
          <option value="">물류 전체</option>
          {logistics.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[13px]">
          <input type="checkbox" checked={undelivered} onChange={(e) => setUndelivered(e.target.checked)} />
          미배송
        </label>
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[13px] leading-[1.6] text-dim">{msg}</p>}

      <div className="rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold">환불요청 · CJ 분쟁 (공장 전송 전)</p>
          <button type="button" className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold" onClick={() => void pullReturns()}>
            쿠팡 환불요청 불러오기
          </button>
        </div>
        {disputes.length === 0 && <p className="mt-1 text-[13px] leading-[1.6] text-dim">대기 중인 환불요청 없음</p>}
        <ul className="mt-1 space-y-2 text-[13px] leading-[1.6]">
          {disputes.map((d) => (
            <li key={d.soId}>
              SO#{d.soId} {d.product}
              {d.draft ? (
                <>
                  {" · "}
                  <span className={d.draft.state === "ready" ? "font-bold" : "text-coral"}>
                    {d.draft.state === "ready" ? "접수 전 대기" : "확인 필요"}
                  </span>
                  {" · 쿠팡 "}{d.draft.receiptId}
                  {d.draft.channelReason ? ` (${d.draft.channelReason})` : ""}
                  {d.draft.maxAmount != null && ` · 최대 환불 $${d.draft.maxAmount.toFixed(2)}`}
                  {d.draft.note && <span className="block text-dim">{d.draft.note}</span>}
                  {d.draft.reasons?.length ? (
                    <span className="block text-dim">사유 후보: {d.draft.reasons.map((r) => r.reasonName).join(" / ")}</span>
                  ) : null}
                  <a className="underline" href={cjDisputeUrl()} target="_blank" rel="noreferrer">CJ 분쟁 페이지</a>
                </>
              ) : (
                <>
                  {" · "}
                  <a className="underline" href={cjDisputeUrl(d.disputeId)} target="_blank" rel="noreferrer">
                    {d.disputeId ?? "CJ 분쟁"}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <article key={o.id} className="rounded-xl border border-line p-3">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${channelPill(o.channel.code)}`}>
                {channelLabel(o.channel.code)}
              </span>
              <p className="mt-2 text-[13px] font-semibold leading-[1.6]">{o.product.title}</p>
              <p className="text-[12px] text-dim">
                {o.sourcingOrder?.cjStatus ?? o.sourcingOrder?.status} · 원가 {fmt(o.sourcingOrder?.costUsd)} + 배송 {fmt(o.sourcingOrder?.shippingUsd)}
              </p>
              <RowActions o={o} btn={btn} ghost={ghost} onConfirm={confirm} onPay={pay} onAdvance={advance} onUndelivered={markUndelivered} />
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead className="bg-fog">
              <tr>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">공급처</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">CJ주문</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">채널주문</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">원가</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">CJ상태</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">송장</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="text-[13px] leading-[1.6]">
                  <td className="px-2 py-2">{o.sourcingOrder?.supplierName ?? "—"}</td>
                  <td className="px-2 py-2 font-mono text-[12px]">
                    {o.sourcingOrder?.supplierOrderRef ?? "—"}
                    {o.sourcingOrder?.makeupOpen && <span className="ml-1 text-coral">차액</span>}
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-semibold">{o.product.title}</p>
                    <p className="font-mono text-[12px] text-dim">{o.externalOrderRef}</p>
                  </td>
                  <td className="px-2 py-2">{fmt(o.sourcingOrder?.costUsd)} / {fmt(o.sourcingOrder?.shippingUsd)}</td>
                  <td className="px-2 py-2">
                    {o.sourcingOrder?.cjStatus ?? inboxStageLabel(o.stage)}
                    {o.sourcingOrder?.undelivered && <span className="block text-[12px] text-coral">미배송</span>}
                  </td>
                  <td className="px-2 py-2 text-[12px] text-dim">
                    {o.sourcingOrder?.trackingNo ? (
                      <>
                        <a href={o.sourcingOrder.trackUrl ?? trackingPageUrl(o.sourcingOrder.trackingNo)} target="_blank" rel="noreferrer" className="font-mono underline">
                          {o.sourcingOrder.trackingNo}
                        </a>
                        {o.sourcingOrder.trackUrl && (
                          <button
                            type="button"
                            className="ml-2 rounded border border-line px-1.5 py-0.5 text-[12px] hover:bg-fog"
                            onClick={() => void navigator.clipboard?.writeText(`[LEXI] ${o.product.title}\n배송 추적: ${o.sourcingOrder!.trackUrl}`)}
                          >
                            안내문 복사
                          </button>
                        )}
                      </>
                    ) : (
                      (o.sourcingOrder?.logisticName ?? "—")
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <RowActions o={o} btn={btn} ghost={ghost} onConfirm={confirm} onPay={pay} onAdvance={advance} onUndelivered={markUndelivered} />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-dim">
                    발주 없음. <Link href="/hq/purchase-requests" className="underline">구매요청</Link>에서 소싱발주하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RowActions({
  o, btn, ghost, onConfirm, onPay, onAdvance, onUndelivered,
}: {
  o: PurchaseInboxRow;
  btn: string;
  ghost: string;
  onConfirm: (id: number) => void;
  onPay: (id: number) => void;
  onAdvance: (id: number, to: string) => void;
  onUndelivered: (id: number, v: boolean) => void;
}) {
  const so = o.sourcingOrder;
  if (!so) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {(so.cjStatus === "CREATED" || so.cjStatus === "IN_CART") && (
        <button type="button" className={btn} onClick={() => void onConfirm(so.id)}>CJ 주문확정</button>
      )}
      {so.cjConfirmError && <span className="w-full text-[12px] text-coral">{so.cjConfirmError}</span>}
      {isCjUnpaid(so.cjStatus) && (
        <>
          <button type="button" className={btn} onClick={() => void onPay(so.id)}>잔액결제</button>
          {so.payUrl && (
            <a className={ghost} href={so.payUrl} target="_blank" rel="noreferrer">CJ 결제</a>
          )}
        </>
      )}
      {so.nextTo && (
        <button type="button" className={btn} onClick={() => void onAdvance(so.id, so.nextTo!)}>
          {NEXT_KO[so.nextTo]}
        </button>
      )}
      {(so.disputeId || so.openDispute) && (
        <a className={ghost} href={cjDisputeUrl(so.disputeId)} target="_blank" rel="noreferrer">분쟁</a>
      )}
      <button type="button" className={ghost} onClick={() => void onUndelivered(so.id, !so.undelivered)}>
        {so.undelivered ? "미배송 해제" : "미배송"}
      </button>
      {o.settlement && (
        <Link href={`/hq/settlements?channel=${o.channel.code}`} className={ghost}>정산</Link>
      )}
    </div>
  );
}
