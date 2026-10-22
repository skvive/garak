"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { channelLabel } from "@/lib/hq/channel-ui";
import { CjMoneyStrip } from "./CjMoneyStrip";
import type { CjWalletSnapshot } from "@/lib/hq/cj-order";

type SettlementRow = {
  periodKey: string;
  channelCode: string;
  orderCount: number;
  revenueUsd: number;
  refundUsd: number;
  netRevenueUsd: number;
  costUsd: number;
  marginUsd: number;
};

type Summary = {
  period: "daily" | "monthly" | "yearly";
  rows: SettlementRow[];
  total: {
    orderCount: number;
    revenueUsd: number;
    refundUsd: number;
    netRevenueUsd: number;
    costUsd: number;
    marginUsd: number;
  };
  pending?: {
    id: number;
    sourcingOrderId: number;
    channelCode?: string;
    marginUsd: number;
    costUsd: number;
    shippingUsd: number;
    blocked: string | null;
  }[];
  channels: string[];
};

async function api(path: string) {
  const res = await fetch(`/api/hq${path}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

export function SettlementDashboard() {
  const search = useSearchParams();
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [channel, setChannel] = useState<string>(search.get("channel") || "all");
  const [data, setData] = useState<Summary | null>(null);
  const [money, setMoney] = useState<CjWalletSnapshot | null>(null);
  const [wingNote, setWingNote] = useState("");
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (channel !== "all") params.set("channel", channel);
      const d = await api(`/settlements/summary?${params}`);
      setData(d);
      const wallet = await fetch("/api/hq/cj/money").then((r) => r.json()).catch(() => null);
      if (wallet && !wallet.error) setMoney(wallet);
      if (channel === "coupang") {
        const w = await fetch("/api/hq/channels/coupang?view=settlements").then((r) => r.json()).catch(() => null);
        if (w?.note) setWingNote(String(w.note));
        else setWingNote("");
      } else setWingNote("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    }
  }, [period, channel]);

  useEffect(() => { void load(); }, [load]);

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const refundRate = data ? (data.total.revenueUsd > 0 ? (data.total.refundUsd / data.total.revenueUsd) * 100 : 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-semibold">정산 대시보드</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            위: CJ에 내는 돈. 아래: 채널 매출 마진. 두 숫자를 더하지 않는다.
            {" "}
            <Link href="/hq/purchase-requests" className="underline">구매요청</Link>
            {" · "}
            <Link href="/hq/sourcing-orders" className="underline">소싱발주</Link>
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[11px] text-dim">{msg}</p>}

      <CjMoneyStrip money={money} />
      {wingNote && (
        <p className="rounded-xl border border-line p-3 text-[13px] leading-relaxed text-dim">
          Coupang Wing 정산: {wingNote}. HQ 마진 원장과 더하지 않습니다.
        </p>
      )}

      {data?.pending && data.pending.length > 0 && (
        <div className="rounded-xl border border-line p-3">
          <p className="text-[13px] font-bold">마진 확정 대기</p>
          <ul className="mt-2 space-y-2">
            {data.pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px] leading-[1.6]">
                <span>
                  #{p.id} {channelLabel(p.channelCode ?? "")} 마진 {fmt(p.marginUsd)}
                  {p.blocked && <span className="ml-2 text-coral">{p.blocked}</span>}
                </span>
                <button
                  type="button"
                  disabled={Boolean(p.blocked)}
                  className="rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
                  onClick={async () => {
                    setMsg("");
                    try {
                      const res = await fetch(`/api/hq/settlements/${p.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "confirm" }),
                      });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error((j as { error?: string }).error ?? "confirm failed");
                      await load();
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : "failed");
                    }
                  }}
                >
                  확정
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI 카드 */}
      {data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "총매출", value: fmt(data.total.revenueUsd), color: "text-ink" },
            { label: "환불", value: fmt(data.total.refundUsd), color: "text-coral" },
            { label: "순매출", value: fmt(data.total.netRevenueUsd), color: "text-sage" },
            { label: "마진", value: fmt(data.total.marginUsd), color: data.total.marginUsd >= 0 ? "text-sage" : "text-coral" },
            { label: "환불율", value: `${refundRate.toFixed(1)}%`, color: refundRate < 5 ? "text-sage" : "text-coral" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-line p-4">
              <p className="text-[11px] text-dim">{kpi.label}</p>
              <p className={`mt-1 text-[20px] font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.label === "총매출" && (
                <p className="mt-0.5 text-[10px] text-dim">{data.total.orderCount}건</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-line bg-fog p-1">
          {(["daily", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${period === p ? "bg-ink text-white" : "text-dim"}`}
            >
              {p === "daily" ? "일별" : p === "monthly" ? "월별" : "연별"}
            </button>
          ))}
        </div>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-lg border border-line px-3 py-1.5 text-[12px]"
        >
          <option value="all">전체 채널</option>
          {data?.channels.map((c) => (
            <option key={c} value={c}>{channelLabel(c)}</option>
          ))}
        </select>
      </div>

      {/* 차트 영역 (간단 바 차트) */}
      {data && data.rows.length > 0 && (
        <div className="rounded-xl border border-line p-4">
          <p className="mb-3 text-[12px] font-bold">매출 추이</p>
          <div className="flex items-end gap-1 h-32">
            {data.rows.slice(0, 12).map((r) => {
              const maxRev = Math.max(...data.rows.map((x) => x.netRevenueUsd));
              const height = maxRev > 0 ? (r.netRevenueUsd / maxRev) * 100 : 0;
              return (
                <div key={r.periodKey} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-sage/60 hover:bg-sage transition-colors"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${r.periodKey}: ${fmt(r.netRevenueUsd)}`}
                  />
                  <span className="text-[9px] text-dim truncate w-full text-center">{r.periodKey.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 상세 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full">
          <thead className="bg-fog">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-dim">기간</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-dim">채널</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-dim">주문</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-dim">매출</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-dim">환불</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-dim">순매출</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-dim">원가</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-dim">마진</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.rows.map((r) => (
              <tr key={`${r.periodKey}-${r.channelCode}`} className="text-[12px] hover:bg-fog/50">
                <td className="px-3 py-2 font-mono text-[11px]">{r.periodKey}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-fog px-2 py-0.5 text-[10px] font-bold">
                    {channelLabel(r.channelCode)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{r.orderCount}</td>
                <td className="px-3 py-2 text-right price">{fmt(r.revenueUsd)}</td>
                <td className="px-3 py-2 text-right text-coral">{fmt(r.refundUsd)}</td>
                <td className="px-3 py-2 text-right price font-bold">{fmt(r.netRevenueUsd)}</td>
                <td className="px-3 py-2 text-right text-dim">{fmt(r.costUsd)}</td>
                <td className={`px-3 py-2 text-right font-bold ${r.marginUsd >= 0 ? "text-sage" : "text-coral"}`}>
                  {fmt(r.marginUsd)}
                </td>
              </tr>
            ))}
            {data && (
              <tr className="bg-fog/50 font-bold text-[12px]">
                <td className="px-3 py-2" colSpan={2}>합계</td>
                <td className="px-3 py-2 text-right">{data.total.orderCount}</td>
                <td className="px-3 py-2 text-right price">{fmt(data.total.revenueUsd)}</td>
                <td className="px-3 py-2 text-right text-coral">{fmt(data.total.refundUsd)}</td>
                <td className="px-3 py-2 text-right price">{fmt(data.total.netRevenueUsd)}</td>
                <td className="px-3 py-2 text-right text-dim">{fmt(data.total.costUsd)}</td>
                <td className={`px-3 py-2 text-right ${data.total.marginUsd >= 0 ? "text-sage" : "text-coral"}`}>
                  {fmt(data.total.marginUsd)}
                </td>
              </tr>
            )}
            {(!data || data.rows.length === 0) && (
              <tr><td colSpan={8} className="p-6 text-center text-dim">정산 데이터 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* LERP 연동 안내 */}
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
        <p className="text-[12px] font-bold text-gold"> LERP 회계 연동</p>
        <p className="mt-1 text-[11px] text-dim">
          shinkangteam/lerp 연동 시 정산 확정 데이터가 자동 전송됩니다.
          현재는 수동 CSV 다운로드를 지원합니다.
        </p>
        <button
          className="mt-2 rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold"
          onClick={() => {
            if (!data) return;
            const csv = [
              "period,channel,orders,revenue,refund,net,cost,margin",
              ...data.rows.map((r) =>
                `${r.periodKey},${r.channelCode},${r.orderCount},${r.revenueUsd},${r.refundUsd},${r.netRevenueUsd},${r.costUsd},${r.marginUsd}`
              ),
            ].join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
            a.download = `settlements-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
          }}
        >
          ⬇ CSV 다운로드
        </button>
      </div>
    </div>
  );
}
