"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HqOverview } from "@/lib/hq/overview";

const HEALTH_KO: Record<string, string> = {
  live: "실연동",
  ready: "준비",
  mock: "목업",
  off: "미연결",
  paused: "정지",
};

const KIND_KO: Record<string, string> = {
  ledger: "원장",
  export: "송출",
  export_failed: "송출",
  pdp: "PDP",
  pdp_review: "PDP",
  inspect: "주문",
  channel: "채널",
  audit: "감사",
};

export function HqDashboardView() {
  const [data, setData] = useState<HqOverview | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/hq/overview");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setData(json as HqOverview);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "load failed");
      }
    })();
  }, []);

  if (err) {
    return <p className="rounded-xl border border-coral/30 bg-coral/5 p-4 text-[13px] text-coral">{err}</p>;
  }
  if (!data) {
    return <p className="text-[13px] text-dim">로딩…</p>;
  }

  const a = data.attention;
  const f = data.funnel;
  const o = data.orders;
  const attention = [
    { label: "검수대기", value: a.inspect, href: "/hq/purchase-requests", hot: a.inspect > 0 },
    { label: "발주대기", value: a.source, href: "/hq/sourcing-orders", hot: a.source > 0 },
    { label: "PDP 리뷰", value: a.pdpReview, href: "/hq/pipeline/pdp", hot: a.pdpReview > 0 },
    { label: "원장 경보", value: a.ledgerAlerts, href: "/hq/ledger", hot: a.ledgerAlerts > 0 },
    { label: "송출 실패", value: a.exportFailed, href: "/hq/pipeline/export", hot: a.exportFailed > 0 },
    { label: "채널 이상", value: a.channelsOff, href: "/hq/channels", hot: a.channelsOff > 0 },
  ];
  const shortcuts = [
    { label: "구매요청", href: "/hq/purchase-requests" },
    { label: "판매채널", href: "/hq/channels" },
    { label: "PDP", href: "/hq/pipeline/pdp" },
    { label: "분산원장", href: "/hq/ledger" },
    { label: "정산", href: "/hq/settlements" },
    { label: "공급처", href: "/hq/suppliers" },
  ];
  const pipeline = [
    { label: "카탈로그", value: f.catalogTotal, href: "/hq/pipeline/catalog" },
    { label: "Import", value: f.imported, href: "/hq/pipeline/import" },
    { label: "PDP", value: f.pdpTotal, href: "/hq/pipeline/pdp" },
    { label: "송출 완료", value: f.exportDone, href: "/hq/pipeline/export" },
  ];
  const orderOps = [
    { label: "검수", value: o.inspect, href: "/hq/purchase-requests" },
    { label: "발주", value: o.source, href: "/hq/sourcing-orders" },
    { label: "배송", value: o.fulfill, href: "/hq/sourcing-orders" },
    { label: "정산", value: o.settle, href: "/hq/settlements" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold">홈</h1>
        <p className="mt-1 text-[13px] leading-[1.6] text-dim">
          오늘 손댈 일 · {data.dataMode === "real" ? "Real" : "Dummy"} · DB {data.dbMode === "neon" ? "Neon" : "로컬"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {attention.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-xl border p-3 ${s.hot ? "border-coral/50 bg-coral/5" : "border-line bg-paper"}`}
          >
            <p className="text-[12px] text-dim">{s.label}</p>
            <p className={`mt-0.5 text-[20px] font-bold ${s.hot ? "text-coral" : ""}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-dim hover:border-ink hover:text-ink"
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="text-[14px] font-bold">액션 큐</h2>
          {data.actionQueue.length === 0 ? (
            <p className="mt-3 text-[13px] leading-[1.6] text-dim">대기 작업 없음</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.actionQueue.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link href={item.href} className="flex items-start gap-2 py-2.5 text-[13px] leading-[1.6] hover:text-coral">
                    <span className="mt-0.5 rounded bg-fog px-1.5 py-0.5 text-[11px] font-bold text-dim">
                      {KIND_KO[item.kind] ?? item.kind}
                    </span>
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold">판매채널</h2>
            <Link href="/hq/channels" className="text-[12px] font-semibold text-dim underline">보드</Link>
          </div>
          <ul className="mt-3 space-y-2">
            {data.channelHealth.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-2 text-[13px] leading-[1.6]">
                <span className="font-semibold">{c.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    c.status === "live" || c.status === "ready"
                      ? "bg-sage/15 text-sage"
                      : c.status === "paused"
                        ? "bg-coral/15 text-coral"
                        : "bg-fog text-dim"
                  }`}
                >
                  {HEALTH_KO[c.status] ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold">소싱 파이프라인</h2>
            <Link href="/hq/pipeline/catalog" className="text-[12px] font-semibold text-dim underline">카탈로그</Link>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {pipeline.map((s) => (
              <Link key={s.label} href={s.href} className="rounded-xl bg-fog p-2 text-center">
                <p className="text-[11px] text-dim">{s.label}</p>
                <p className="mt-0.5 text-[16px] font-bold">{s.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold">주문 · 원장</h2>
            <Link href="/hq/ledger" className="text-[12px] font-semibold text-dim underline">분산원장</Link>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {orderOps.map((s) => (
              <Link key={s.label} href={s.href} className="rounded-xl bg-fog p-2 text-center">
                <p className="text-[11px] text-dim">{s.label}</p>
                <p className="mt-0.5 text-[16px] font-bold">{s.value}</p>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-dim">
            체인 {data.ledger.events}건 · 경보 {data.ledger.openAlerts}
            {data.ledger.lastScan ? ` · 점검 ${data.ledger.lastScan.slice(0, 16).replace("T", " ")}` : ""}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-[14px] font-bold">최근 활동</h2>
        <ul className="mt-3 divide-y divide-line">
          {data.recent.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex justify-between gap-3 py-2 text-[13px] leading-[1.6]">
              <span>
                <span className="mr-2 rounded bg-fog px-1.5 py-0.5 text-[11px] font-bold text-dim">
                  {KIND_KO[r.kind] ?? r.kind}
                </span>
                {r.label}
              </span>
              <span className="shrink-0 text-[12px] text-dim">{r.at.slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
          {data.recent.length === 0 && (
            <li className="py-2 text-[13px] text-dim">아직 활동 없음</li>
          )}
        </ul>
      </section>
    </div>
  );
}
