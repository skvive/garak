"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import {
  LEDGER_ALERT_KO,
  LEDGER_STREAMS,
  type LedgerAlert,
  type LedgerCheckpoint,
  type LedgerEvent,
  type LedgerStream,
} from "@/lib/hq/ledger-types";

type Counts = { events: number; openAlerts: number; byStream: Record<string, number> };

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

function shortHash(h: string) {
  return h.length > 14 ? `${h.slice(0, 10)}…` : h;
}

export function LedgerMonitor() {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [alerts, setAlerts] = useState<LedgerAlert[]>([]);
  const [checkpoints, setCheckpoints] = useState<LedgerCheckpoint[]>([]);
  const [counts, setCounts] = useState<Counts>({ events: 0, openAlerts: 0, byStream: {} });
  const [stream, setStream] = useState<"all" | LedgerStream>("all");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const load = useCallback(async () => {
    try {
      const d = await api("/ledger");
      setEvents((d.events as LedgerEvent[]) ?? []);
      setAlerts((d.alerts as LedgerAlert[]) ?? []);
      setCheckpoints((d.checkpoints as LedgerCheckpoint[]) ?? []);
      setCounts((d.counts as Counts) ?? { events: 0, openAlerts: 0, byStream: {} });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => (stream === "all" ? events : events.filter((e) => e.stream === stream)),
    [events, stream],
  );
  const openAlerts = alerts.filter((a) => a.status === "open");

  const scan = async () => {
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/ledger", "POST", { action: "scan" });
      setMsg(d.ok ? "점검 완료 — 이상 없음" : `점검 완료 — 열린 경보 ${d.openAlerts}건`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "scan failed");
    } finally {
      setBusy(false);
    }
  };

  const ack = async (id: number) => {
    try {
      await api("/ledger", "POST", { action: "ack", id });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ack failed");
    }
  };

  const streamLabel = (id: string) => LEDGER_STREAMS.find((s) => s.id === id)?.label ?? id;
  const btn = "rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold">분산원장</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            상품·주문·정산 등 커머스 원장이 빠지거나 바뀌면 해시 체인과 스냅샷 대조로 알린다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <button type="button" className={btn} disabled={busy} onClick={() => void scan()}>
            {busy ? "점검 중…" : "무결성 점검"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-line p-3">
          <p className="text-[12px] text-dim">체인 기록</p>
          <p className="mt-0.5 text-[20px] font-bold">{counts.events}</p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-[12px] text-dim">열린 경보</p>
          <p className={`mt-0.5 text-[20px] font-bold ${counts.openAlerts ? "text-coral" : "text-sage"}`}>
            {counts.openAlerts}
          </p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-[12px] text-dim">최근 점검</p>
          <p className="mt-0.5 text-[13px] leading-[1.6] font-semibold">
            {checkpoints[0]?.createdAt ? checkpoints[0].createdAt.slice(0, 16).replace("T", " ") : "없음"}
          </p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-[12px] text-dim">상태</p>
          <p className="mt-0.5 text-[13px] font-semibold leading-[1.6]">
            {counts.openAlerts ? "감시 경보" : "정상"}
          </p>
        </div>
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[13px] leading-[1.6] text-dim">{msg}</p>}

      {openAlerts.length > 0 && (
        <div className="space-y-2 rounded-xl border border-coral/40 bg-coral/5 p-3">
          <p className="text-[13px] font-bold">열린 경보</p>
          {openAlerts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px] leading-[1.6]">
              <span>
                <span className="font-semibold">{LEDGER_ALERT_KO[a.kind]}</span>
                {" · "}
                {streamLabel(a.stream)} — {a.detail}
              </span>
              <button type="button" className={btn} onClick={() => void ack(a.id)}>확인</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStream("all")}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${stream === "all" ? "bg-ink text-white" : "bg-fog text-dim"}`}
        >
          전체 ({counts.events})
        </button>
        {LEDGER_STREAMS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStream(s.id)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ${stream === s.id ? "bg-ink text-white" : "bg-fog text-dim"}`}
          >
            {s.label} ({counts.byStream[s.id] ?? 0})
          </button>
        ))}
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <article key={e.id} className="rounded-xl border border-line p-3 text-[13px] leading-[1.6]">
              <p className="font-semibold">{streamLabel(e.stream)} · {e.action}</p>
              <p className="text-dim">{e.entity} #{e.entityId} · {e.actor}</p>
              <p className="font-mono text-[12px] text-dim">#{e.seq} {shortHash(e.recordHash)}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead className="bg-fog">
              <tr>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">스트림</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">기록</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">행위자</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">해시</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((e) => (
                <tr key={e.id} className="text-[13px] leading-[1.6]">
                  <td className="px-2 py-2">{streamLabel(e.stream)}</td>
                  <td className="px-2 py-2">{e.action} · {e.entity} #{e.entityId}</td>
                  <td className="px-2 py-2 text-dim">{e.actor}</td>
                  <td className="px-2 py-2 font-mono text-[12px]">{shortHash(e.recordHash)}</td>
                  <td className="px-2 py-2 text-dim">{e.createdAt.slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-dim">
                    체인 기록이 없습니다. 원장 변경이 생기면 자동 기록되고, 상단 점검으로 스냅샷을 남깁니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {checkpoints.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <p className="bg-fog px-3 py-2 text-[12px] font-bold text-dim">최근 점검 스냅샷</p>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">스트림</th>
                <th className="px-2 py-2 text-right text-[12px] font-bold text-dim">원장 건수</th>
                <th className="px-2 py-2 text-right text-[12px] font-bold text-dim">체인</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">점검 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {checkpoints.map((c) => (
                <tr key={c.id} className="text-[13px] leading-[1.6]">
                  <td className="px-2 py-2">{streamLabel(c.stream)}</td>
                  <td className="px-2 py-2 text-right">{c.censusCount}</td>
                  <td className="px-2 py-2 text-right">{c.eventCount}</td>
                  <td className="px-2 py-2 text-dim">{c.createdAt.slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
