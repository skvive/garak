"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Cafe24Panel } from "@/components/admin/cafe24-panel";
import { ShopifyPanel } from "@/components/admin/shopify-panel";
import { AmazonAuPanel } from "@/components/hq/AmazonAuPanel";
import { ShopeePanel } from "@/components/hq/ShopeePanel";
import { CoupangPanel } from "@/components/hq/CoupangPanel";
import { channelPill } from "@/lib/hq/channel-ui";
import type { SalesChannelCard, SalesHealth } from "@/lib/hq/sales-channels";

type Kpis = {
  commerce: number;
  content: number;
  live: number;
  mock: number;
  off: number;
  paused: number;
  openOrders: number;
  inspect: number;
};

const HEALTH_KO: Record<SalesHealth, string> = {
  live: "실연동",
  ready: "준비",
  mock: "목업",
  off: "미연결",
  paused: "정지",
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

export function SalesChannelsBoard() {
  const [cards, setCards] = useState<SalesChannelCard[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [open, setOpen] = useState<SalesChannelCard | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = (d: { cards?: SalesChannelCard[]; kpis?: Kpis }) => {
    if (d.cards) {
      setCards(d.cards);
      setOpen((prev) => (prev ? d.cards!.find((c) => c.code === prev.code) ?? prev : null));
    }
    if (d.kpis) setKpis(d.kpis);
  };

  const load = useCallback(async () => {
    try {
      apply(await api("/sales-channels"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const patch = async (code: string, body: Record<string, unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      apply(await api("/sales-channels", "PATCH", { code, ...body }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  const pull = async (code: string) => {
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/sales-channels", "POST", { action: "pull", code });
      apply(d);
      const p = d.pull as { created?: number; pulled?: number } | undefined;
      setMsg(`인입 ${p?.created ?? 0}건 (수신 ${p?.pulled ?? 0})`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "pull failed");
    } finally {
      setBusy(false);
    }
  };

  const kpiBox = [
    ["판매", kpis?.commerce ?? 0],
    ["콘텐츠", kpis?.content ?? 0],
    ["연결·준비", kpis?.live ?? 0],
    ["목업", kpis?.mock ?? 0],
    ["주문", kpis?.openOrders ?? 0],
    ["검수대기", kpis?.inspect ?? 0],
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[24px] font-semibold">판매채널</h1>
        <p className="mt-1 text-[13px] leading-[1.6] text-dim">
          채널을 눌러 연결·주문·정지를 본다. 콘텐츠 채널은 유입용이고 구매요청 원장에 넣지 않는다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {kpiBox.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-line p-3">
            <p className="text-[12px] text-dim">{label}</p>
            <p className="mt-0.5 text-[20px] font-bold">{n}</p>
          </div>
        ))}
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[13px] leading-[1.6] text-dim">{msg}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setOpen(c)}
            className="rounded-2xl border border-line bg-paper p-4 text-left hover:border-ink/40"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`grid size-10 place-items-center rounded-xl text-[15px] font-bold ${channelPill(c.code)}`}>
                {c.mark}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${healthCls(c.health)}`}>
                {HEALTH_KO[c.health]}
              </span>
            </div>
            <p className="mt-3 font-display text-[18px] font-semibold">{c.label}</p>
            <p className="mt-1 text-[12px] font-semibold text-dim">
              {c.family === "commerce" ? "판매" : "콘텐츠"}
            </p>
            {c.family === "commerce" && c.listingStats ? (
              <p className="mt-2 text-[12px] leading-[1.6] text-dim">
                진열대기 {c.listingStats.pending} · 판매중 {c.listingStats.live} · 판매중지{" "}
                {c.listingStats.stopped}
              </p>
            ) : (
              <p className="mt-1 text-[13px] leading-[1.6] text-dim">
                {c.handle ? `@${c.handle}` : "핸들 미등록"}
              </p>
            )}
            {c.family === "commerce" && (
              <p className="mt-1 text-[11px] text-dim">
                주문 {c.orders} · 검수 {c.inspect}
              </p>
            )}
          </button>
        ))}
      </div>

      {open && (
        <ChannelDialog title={open.label} onClose={() => setOpen(null)}>
          <ChannelPopup
            card={open}
            busy={busy}
            onPause={(paused) => void patch(open.code, { paused })}
            onPull={() => void pull(open.code)}
            onSave={(handle, note) => void patch(open.code, { handle, note })}
          />
        </ChannelDialog>
      )}
    </div>
  );
}

function healthCls(h: SalesHealth) {
  if (h === "live" || h === "ready") return "bg-sage/15 text-sage";
  if (h === "paused") return "bg-coral/15 text-coral";
  if (h === "mock") return "bg-gold/15 text-gold";
  return "bg-fog text-dim";
}

function ChannelDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-paper p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-[18px] font-semibold" style={{ textWrap: "balance" }}>{title}</h2>
          <button type="button" className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-bold" onClick={onClose}>
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChannelPopup({
  card,
  busy,
  onPause,
  onPull,
  onSave,
}: {
  card: SalesChannelCard;
  busy: boolean;
  onPause: (paused: boolean) => void;
  onPull: () => void;
  onSave: (handle: string, note: string) => void;
}) {
  const [handle, setHandle] = useState(card.handle ?? "");
  const [note, setNote] = useState(card.note ?? "");
  const [stats, setStats] = useState(card.listingStats);
  const [statsNote, setStatsNote] = useState(card.listingStats?.note ?? "");
  useEffect(() => {
    setHandle(card.handle ?? "");
    setNote(card.note ?? "");
    setStats(card.listingStats);
    setStatsNote(card.listingStats?.note ?? "");
  }, [card.code, card.handle, card.note, card.listingStats]);

  const refreshStats = async () => {
    try {
      const d = await api(`/channels/${card.code}/listing-stats`);
      if (d.listingStats) setStats(d.listingStats as typeof stats);
      if (d.note) setStatsNote(String(d.note));
    } catch {
      /* keep */
    }
  };

  const btn = "rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40";
  const ghost = "rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold disabled:opacity-40";

  return (
    <div className="space-y-4 text-[13px] leading-[1.6]">
      <p className="text-dim">{card.blurb}</p>
      <dl className="divide-y divide-line rounded-xl border border-line">
        <Row k="상태" v={`${HEALTH_KO[card.health]} · ${card.healthNote}`} />
        {card.family === "commerce" && (
          <>
            <Row k="주문" v={`${card.orders}건 · 검수대기 ${card.inspect}`} />
            <Row k="게시 리스팅" v={`${card.listings}건`} />
            <Row
              k="상품상태"
              v={
                stats
                  ? `진열대기 ${stats.pending} · 판매중 ${stats.live} · 판매중지 ${stats.stopped}${statsNote ? ` (${statsNote})` : ""}`
                  : "—"
              }
            />
            <Row k="통화 / 수수료" v={`${card.currency ?? "—"} · ${card.feeRate != null ? `${(card.feeRate * 100).toFixed(1)}%` : "—"}`} />
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2">
        {card.dashboardUrl && (
          <a
            href={card.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} inline-block`}
          >
            실대시보드 열기
          </a>
        )}
        {card.family === "commerce" && (
          <button type="button" className={ghost} disabled={busy} onClick={() => void refreshStats()}>
            상태 새로고침
          </button>
        )}
        <button type="button" className={ghost} disabled={busy} onClick={() => onPause(!card.paused)}>
          {card.paused ? "재개" : "일시정지"}
        </button>
        {card.canPull && (
          <button type="button" className={btn} disabled={busy} onClick={onPull}>
            주문 인입
          </button>
        )}
        {card.hqCode && (
          <>
            <Link href={`/hq/purchase-requests?channel=${card.hqCode}`} className={`${ghost} inline-block`}>
              구매요청
            </Link>
            <Link href="/hq/pipeline/export" className={`${ghost} inline-block`}>
              Export
            </Link>
          </>
        )}
      </div>

      {card.family === "content" && (
        <div className="grid gap-2 rounded-xl border border-line p-3">
          <label className="grid gap-1">
            <span className="text-[12px] font-bold text-dim">계정 핸들</span>
            <input
              className="min-h-[40px] rounded-lg border border-line px-3"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@lexistyle"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[12px] font-bold text-dim">운영 메모</span>
            <input
              className="min-h-[40px] rounded-lg border border-line px-3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="주 3회 릴스 / 쇼츠 컷"
            />
          </label>
          <button type="button" className={btn} disabled={busy} onClick={() => onSave(handle, note)}>
            저장
          </button>
        </div>
      )}

      {card.code === "lexi" && <Cafe24Panel />}
      {card.code === "shopify" && <ShopifyPanel />}
      {card.code === "amazon_au" && <AmazonAuPanel />}
      {card.code === "shopee" && <ShopeePanel />}
      {card.code === "coupang" && <CoupangPanel />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 px-3 py-2">
      <dt className="text-[12px] font-bold text-dim">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
