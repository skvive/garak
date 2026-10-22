"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { channelLabel, channelPill } from "@/lib/hq/channel-ui";
import { inboxStageLabel, type InboxStage, type PurchaseInboxRow } from "@/lib/hq/inbox-types";

type Channel = { id: number; code: string; name: string; pullOrders?: boolean };
type MatchOption = { id: number; title: string; externalRef?: string };
type Counts = { all: number; byChannel: Record<string, number>; byStage: Record<InboxStage, number> };

const STAGES: InboxStage[] = ["inspect", "source", "fulfill", "settle", "done", "exception"];
const VIEW_KEY = "lexi-hq-purchase-view";

const STATUS_KO: Record<string, string> = {
  received: "인입",
  matched: "매칭",
  vetted: "검수완료",
  sourcing: "발주중",
  fulfilled: "배송완료",
  closed: "정산완료",
  rejected: "거절",
  refund_delegated: "환불위임",
};

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
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(text.slice(0, 160) || `HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(String(json.error ?? `HTTP ${res.status}`));
  return json;
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

export function OrderInbox() {
  const [rows, setRows] = useState<PurchaseInboxRow[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, byChannel: {}, byStage: { inspect: 0, source: 0, fulfill: 0, settle: 0, done: 0, exception: 0 } });
  const [matchOptions, setMatchOptions] = useState<Record<string, MatchOption[]>>({});
  const [channel, setChannel] = useState("all");
  const [stage, setStage] = useState<"all" | InboxStage>("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [pulling, setPulling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [popup, setPopup] = useState<{ kind: "product" | "buyer"; row: PurchaseInboxRow } | null>(null);

  useEffect(() => {
    try {
      const ch = new URLSearchParams(window.location.search).get("channel");
      if (ch) setChannel(ch);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  const changeView = (m: ViewMode) => {
    setViewMode(m);
    try { localStorage.setItem(VIEW_KEY, m); } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await api("/purchase-requests");
      setRows((data.rows as PurchaseInboxRow[]) ?? []);
      setChannels((data.channels as Channel[]) ?? []);
      setCounts((data.counts as Counts) ?? {
        all: 0,
        byChannel: {},
        byStage: { inspect: 0, source: 0, fulfill: 0, settle: 0, done: 0, exception: 0 },
      });
      setMatchOptions((data.matchOptions as Record<string, MatchOption[]>) ?? {});
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (channel !== "all" && r.channel.code !== channel) return false;
      if (stage !== "all" && r.stage !== stage) return false;
      return true;
    });
  }, [rows, channel, stage]);

  const pull = async () => {
    setPulling(true);
    setMsg("");
    try {
      const r = await api("/purchase-requests/pull-all", "POST", {
        channels: channel === "all" ? undefined : [channel],
      });
      const results = (r.results as { channel: string; ok: boolean; created?: number; error?: string }[]) ?? [];
      const ok = results.filter((x) => x.ok).map((x) => `${channelLabel(x.channel)} ${x.created ?? 0}건`);
      const fail = results.filter((x) => !x.ok).map((x) => `${channelLabel(x.channel)}: ${x.error}`);
      setMsg([ok.length ? `인입 ${ok.join(" · ")}` : "", fail.length ? `실패 ${fail.join(" · ")}` : ""].filter(Boolean).join(" / ") || "인입 없음");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "pull failed");
    } finally {
      setPulling(false);
    }
  };

  const act = async (fn: () => Promise<void>) => {
    setMsg("");
    try {
      await fn();
      setSelected([]);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  const vet = (id: number) => act(async () => {
    await api(`/purchase-requests/${id}`, "PATCH", { action: "vet" });
    setMsg(`검수 완료 #${id}`);
  });

  const reject = (id: number) => act(async () => {
    const reason = window.prompt("거절 사유") ?? "";
    if (!reason.trim()) return;
    await api(`/purchase-requests/${id}`, "PATCH", { action: "reject", reason });
    setMsg(`거절 #${id}`);
  });

  const match = (id: number, channelListingId: number) => act(async () => {
    await api(`/purchase-requests/${id}`, "PATCH", { action: "match", channelListingId });
    setMsg(`매칭 #${id}`);
  });

  const source = (id: number) => act(async () => {
    await api("/sourcing-orders", "POST", { purchaseRequestId: id, autoVet: true });
    setMsg(`소싱발주 생성 #${id}`);
  });

  const advance = (soId: number, to: string) => act(async () => {
    await api(`/sourcing-orders/${soId}`, "PATCH", { to });
    setMsg(to === "delivered" ? `배송완료 · 정산 원장 생성 SO#${soId}` : `${NEXT_KO[to] ?? to} SO#${soId}`);
  });

  const confirmSettle = (stId: number) => act(async () => {
    await api(`/settlements/${stId}`, "PATCH", { action: "confirm" });
    setMsg(`정산 확정 #${stId}`);
  });

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const bulkVet = () => act(async () => {
    for (const id of selected) await api(`/purchase-requests/${id}`, "PATCH", { action: "vet" });
    setMsg(`검수 ${selected.length}건`);
  });

  const bulkSource = () => act(async () => {
    for (const id of selected) await api("/sourcing-orders", "POST", { purchaseRequestId: id, autoVet: true });
    setMsg(`소싱발주 ${selected.length}건`);
  });

  const btn = "rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-40";
  const btnGhost = "rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-40";
  const kpi = counts.byStage;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold">구매요청</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            판매 플랫폼 상품페이지 주문을 채널별로 보고, 검수·소싱발주·정산한다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={changeView} />
          <button type="button" className={btn} disabled={pulling} onClick={() => void pull()}>
            {pulling ? "인입 중…" : channel === "all" ? "채널 주문 인입" : `${channelLabel(channel)} 인입`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {([
          ["inspect", "검수대기"],
          ["source", "발주대기"],
          ["fulfill", "배송중"],
          ["settle", "정산대기"],
          ["done", "완료"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStage(stage === key ? "all" : key)}
            className={`rounded-xl border p-3 text-left ${stage === key ? "border-ink" : "border-line"}`}
          >
            <p className="text-[12px] text-dim">{label}</p>
            <p className="mt-0.5 text-[20px] font-bold">{kpi[key] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChannel("all")}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${channel === "all" ? "bg-ink text-white" : "bg-fog text-dim"}`}
        >
          전체 ({counts.all})
        </button>
        {channels.map((ch) => (
          <button
            key={ch.code}
            type="button"
            onClick={() => setChannel(ch.code)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ${channel === ch.code ? "bg-ink text-white" : "bg-fog text-dim"}`}
          >
            {channelLabel(ch.code)} ({counts.byChannel[ch.code] ?? 0})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStage("all")}
          className={`rounded-full px-3 py-1 text-[12px] font-semibold ${stage === "all" ? "bg-ink text-white" : "border border-line text-dim"}`}
        >
          단계 전체
        </button>
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${stage === s ? "bg-ink text-white" : "border border-line text-dim"}`}
          >
            {inboxStageLabel(s)} ({kpi[s] ?? 0})
          </button>
        ))}
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[13px] leading-[1.6] text-dim">{msg}</p>}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-fog p-2">
          <span className="text-[13px] font-semibold">{selected.length}건 선택</span>
          <button type="button" className={btn} onClick={() => void bulkVet()}>일괄 검수</button>
          <button type="button" className={btn} onClick={() => void bulkSource()}>일괄 소싱발주</button>
          <button type="button" className={btnGhost} onClick={() => setSelected([])}>선택 해제</button>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <article key={o.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="mt-1" />
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-fog">
                  {o.product.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.product.thumbUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${channelPill(o.channel.code)}`}>
                    {channelLabel(o.channel.code)}
                  </span>
                  <p className="mt-1 text-[13px] font-semibold leading-[1.6]">{o.product.title}</p>
                  <button
                    type="button"
                    className="font-mono text-[11px] text-dim underline decoration-line underline-offset-2 hover:text-ink"
                    onClick={() => setPopup({ kind: "product", row: o })}
                  >
                    {o.externalOrderRef}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-[1.6]">
                <button
                  type="button"
                  className="font-semibold underline decoration-line underline-offset-2 hover:text-coral"
                  onClick={() => setPopup({ kind: "buyer", row: o })}
                >
                  {o.buyerName || "구매자"}
                </button>
                {" · "}{o.buyerCountry || "—"} · {money(o.paidAmount, o.currency)} ×{o.qty}
              </p>
              <RowActions
                o={o}
                options={matchOptions[o.channel.code] ?? []}
                onVet={() => void vet(o.id)}
                onReject={() => void reject(o.id)}
                onMatch={(lid) => void match(o.id, lid)}
                onSource={() => void source(o.id)}
                onAdvance={(to) => o.sourcingOrder && void advance(o.sourcingOrder.id, to)}
                onConfirm={() => o.settlement && void confirmSettle(o.settlement.id)}
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead className="bg-fog">
              <tr>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim"></th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">채널 / 상품</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">주문</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">구매자</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">결제</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">단계</th>
                <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((o) => (
                <tr key={o.id} className="text-[13px] leading-[1.6] hover:bg-fog/50">
                  <td className="px-2 py-2">
                    <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-fog">
                        {o.product.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.product.thumbUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${channelPill(o.channel.code)}`}>
                          {channelLabel(o.channel.code)}
                        </span>
                        <p className="truncate font-semibold">{o.product.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-[12px]">
                    <button
                      type="button"
                      className="text-left underline decoration-line underline-offset-2 hover:text-coral"
                      onClick={() => setPopup({ kind: "product", row: o })}
                    >
                      {o.externalOrderRef}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="block text-left font-semibold underline decoration-line underline-offset-2 hover:text-coral"
                      onClick={() => setPopup({ kind: "buyer", row: o })}
                    >
                      {o.buyerName || "구매자"}
                    </button>
                    <div className="text-[12px] text-dim">{o.buyerCountry} {o.buyerPhone || o.buyerEmail || ""}</div>
                  </td>
                  <td className="px-2 py-2 font-bold">{money(o.paidAmount, o.currency)} ×{o.qty}</td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-fog px-2 py-0.5 text-[11px] font-bold">
                      {inboxStageLabel(o.stage)} · {STATUS_KO[o.status] ?? o.status}
                    </span>
                    {o.sourcingOrder && (
                      <div className="text-[12px] text-dim">발주 #{o.sourcingOrder.id} {o.sourcingOrder.supplierName ?? ""}</div>
                    )}
                    {o.settlement && (
                      <div className="text-[12px] text-dim">정산 #{o.settlement.id} ${o.settlement.marginUsd.toFixed(2)}</div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <RowActions
                      o={o}
                      options={matchOptions[o.channel.code] ?? []}
                      onVet={() => void vet(o.id)}
                      onReject={() => void reject(o.id)}
                      onMatch={(lid) => void match(o.id, lid)}
                      onSource={() => void source(o.id)}
                      onAdvance={(to) => o.sourcingOrder && void advance(o.sourcingOrder.id, to)}
                      onConfirm={() => o.settlement && void confirmSettle(o.settlement.id)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-dim">
                    {busy ? "불러오는 중…" : "이 채널에 주문이 없습니다. 상단에서 채널 주문을 인입하세요."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "grid" && filtered.length === 0 && (
        <p className="p-6 text-center text-[13px] text-dim">
          {busy ? "불러오는 중…" : "이 채널에 주문이 없습니다. 상단에서 채널 주문을 인입하세요."}
        </p>
      )}

      {popup && (
        <InboxDialog title={popup.kind === "product" ? "상품페이지" : "구매자 정보"} onClose={() => setPopup(null)}>
          {popup.kind === "product" ? <ProductPreview row={popup.row} /> : <BuyerPreview row={popup.row} />}
        </InboxDialog>
      )}
    </div>
  );
}

function RowActions({
  o,
  options,
  onVet,
  onReject,
  onMatch,
  onSource,
  onAdvance,
  onConfirm,
}: {
  o: PurchaseInboxRow;
  options: MatchOption[];
  onVet: () => void;
  onReject: () => void;
  onMatch: (listingId: number) => void;
  onSource: () => void;
  onAdvance: (to: string) => void;
  onConfirm: () => void;
}) {
  const btn = "rounded-lg bg-ink px-2 py-1 text-[12px] font-bold text-white disabled:opacity-40";
  const ghost = "rounded-lg border border-line px-2 py-1 text-[12px] font-bold disabled:opacity-40";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {(o.status === "received" || o.status === "matched") && (
        <>
          <button type="button" className={btn} onClick={onVet}>검수</button>
          <button type="button" className={ghost} onClick={onReject}>거절</button>
        </>
      )}
      {!o.matched && options.length > 0 && (o.status === "received") && (
        <select
          className="max-w-[160px] rounded-lg border border-line px-2 py-1 text-[12px]"
          defaultValue=""
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v) onMatch(v);
          }}
        >
          <option value="">리스팅 매칭</option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      )}
      {(o.status === "vetted" || ((o.status === "received" || o.status === "matched") && o.canSource)) && (
        <button type="button" className={btn} disabled={!o.canSource} onClick={onSource} title={o.canSource ? "" : "채널 리스팅 매칭 후 발주"}>
          소싱발주
        </button>
      )}
      {o.sourcingOrder?.nextTo && (
        <button type="button" className={btn} onClick={() => onAdvance(o.sourcingOrder!.nextTo!)}>
          {NEXT_KO[o.sourcingOrder.nextTo] ?? o.sourcingOrder.nextTo}
        </button>
      )}
      {o.settlement?.status === "pending" && (
        <button type="button" className={btn} onClick={onConfirm}>정산 확정</button>
      )}
      {o.settlement && (
        <Link href={`/hq/settlements?channel=${o.channel.code}`} className={`${ghost} inline-block`}>
          정산 보기
        </Link>
      )}
      {o.sourcingOrder && !o.settlement && (
        <Link href="/hq/sourcing-orders" className={`${ghost} inline-block`}>발주 보드</Link>
      )}
    </div>
  );
}

function InboxDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-5 shadow-2xl">
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

function ProductPreview({ row }: { row: PurchaseInboxRow }) {
  const pageUrl = row.product.pageUrl;
  const sameOrigin = Boolean(pageUrl?.startsWith("/"));
  return (
    <div className="space-y-3 text-[13px] leading-[1.6]">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-fog">
          {row.product.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.product.thumbUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${channelPill(row.channel.code)}`}>
            {channelLabel(row.channel.code)}
          </p>
          <p className="mt-1 font-semibold">{row.product.title}</p>
          <p className="font-mono text-[12px] text-dim">주문 {row.externalOrderRef}</p>
          {row.product.listingRef && <p className="text-[12px] text-dim">상품키 {row.product.listingRef}</p>}
        </div>
      </div>
      {row.product.description && <p className="text-dim">{row.product.description}</p>}
      {sameOrigin ? (
        <iframe title="상품페이지" src={pageUrl} className="h-[58vh] w-full rounded-xl border border-line bg-white" />
      ) : row.product.html ? (
        <iframe title="상품페이지" srcDoc={row.product.html} sandbox="allow-same-origin" className="h-[58vh] w-full rounded-xl border border-line bg-white" />
      ) : null}
      {pageUrl && (
        <a href={pageUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white">
          상품페이지 새 탭
        </a>
      )}
      {!pageUrl && !row.product.html && !row.product.description && (
        <p className="text-dim">매칭된 상세 HTML이 없습니다. 채널 상품명과 썸네일로 확인하세요.</p>
      )}
    </div>
  );
}

function BuyerPreview({ row }: { row: PurchaseInboxRow }) {
  const addr = row.shippingAddress;
  const addrLine = [addr?.addr1, addr?.addr2, addr?.city, addr?.zip, addr?.country].filter(Boolean).join(" ");
  const rows: [string, string][] = [
    ["연락처", [row.buyerPhone, row.buyerEmail].filter(Boolean).join(" · ") || "—"],
    ["구매옵션", row.optionLabel || "—"],
    ["구매수량", `${row.qty}`],
    ["가격", money(row.paidAmount, row.currency)],
    ["결제방법", row.paymentMethod || "—"],
  ];
  return (
    <div className="space-y-3 text-[13px] leading-[1.6]">
      <p className="font-semibold">{row.buyerName || "구매자"} · {row.buyerCountry || "—"}</p>
      <dl className="divide-y divide-line rounded-xl border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7rem_1fr] gap-2 px-3 py-2">
            <dt className="text-[12px] font-bold text-dim">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {addrLine ? (
          <div className="grid grid-cols-[7rem_1fr] gap-2 px-3 py-2">
            <dt className="text-[12px] font-bold text-dim">배송지</dt>
            <dd>{addrLine}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
