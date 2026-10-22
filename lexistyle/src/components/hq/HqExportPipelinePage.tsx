"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { computeSellPrice } from "@/lib/hq/types";

type ShelfStage = "crafted" | "priced" | "shelf";

type ShelfOption = {
  sku?: string;
  name: string;
  stock: number;
  costUsd?: number;
};

type ShelfItem = {
  id: number;
  documentId: number;
  catalogId: number | null;
  stage: ShelfStage;
  title: string | null;
  titleKo: string | null;
  thumbUrl: string | null;
  sellPriceUsd: string | null;
  stockDefault: number;
  options: ShelfOption[] | null;
  channelsDesired: string[] | null;
};

const CHANNELS = ["lexi", "coupang", "cafe24", "shopify", "amazon_au", "shopee"] as const;

const btn =
  "rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-paper disabled:opacity-40";
const btnGhost =
  "rounded-lg border border-line bg-paper px-3 py-2 text-[12px] font-bold text-ink disabled:opacity-40";
const btnCoral =
  "rounded-lg bg-coral px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40";

async function hq(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api/hq${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

/**
 * Export 3단: 제작목록 → 옵션·가격 → 진열대기 → 채널 송출
 */
export function HqExportPipelinePage() {
  const [tab, setTab] = useState<ShelfStage>("crafted");
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [stockDefault, setStockDefault] = useState(10);
  const [options, setOptions] = useState<ShelfOption[]>([]);
  const [channels, setChannels] = useState<string[]>(["lexi"]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async (stage?: ShelfStage) => {
    const d = await hq(`/export/shelf${stage ? `?stage=${stage}` : ""}`);
    setItems((d.items as ShelfItem[]) ?? []);
  }, []);

  useEffect(() => {
    void load(tab).catch((e) => setMsg(e instanceof Error ? e.message : "load failed"));
    setSelected([]);
    setEditId(null);
  }, [tab, load]);

  const counts = useMemo(() => {
    // lightweight: reload all once for badges when tab changes already loads stage-filtered
    return null;
  }, []);

  const openPrice = async (row: ShelfItem) => {
    setEditId(row.id);
    setSellPrice(row.sellPriceUsd ?? "");
    setStockDefault(row.stockDefault ?? 10);
    setOptions(row.options?.length ? row.options : [{ name: "기본", stock: 10 }]);
    setChannels(row.channelsDesired?.length ? row.channelsDesired : ["lexi"]);
    if (row.catalogId) {
      try {
        const d = await hq(`/catalog/${row.catalogId}/options`);
        if (Array.isArray(d.options) && d.options.length) setOptions(d.options as ShelfOption[]);
        if (d.sellPriceUsd != null && !row.sellPriceUsd) setSellPrice(String(d.sellPriceUsd));
        if (d.stockDefault != null) setStockDefault(Number(d.stockDefault) || 10);
      } catch {
        /* keep existing */
      }
    }
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg("");
    try {
      await fn();
      setMsg(`${label} 완료`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const savePriced = () =>
    run("가격확정", async () => {
      if (!editId) throw new Error("항목을 선택하세요");
      await hq(`/export/shelf/${editId}`, "PATCH", {
        priced: true,
        sellPriceUsd: sellPrice || computeSellPrice(0),
        stockDefault,
        options: options.map((o) => ({ ...o, stock: o.stock > 0 ? o.stock : stockDefault })),
        channelsDesired: channels,
      });
      await load(tab);
    });

  const promote = () =>
    run("진열대기", async () => {
      const ids = selected.length ? selected : editId ? [editId] : [];
      if (!ids.length) throw new Error("항목을 선택하세요");
      await hq("/export/shelf", "POST", { action: "promote", ids });
      setTab("shelf");
    });

  const exportSelected = () =>
    run("채널송출", async () => {
      const ids = selected.length ? selected : [];
      if (!ids.length) throw new Error("진열대기 항목을 선택하세요");
      if (!channels.length) throw new Error("채널을 선택하세요");
      await hq("/export/shelf", "POST", { action: "export", ids, channels });
      await load("shelf");
    });

  const tabs: { id: ShelfStage; label: string }[] = [
    { id: "crafted", label: "A · 제작목록" },
    { id: "priced", label: "B · 옵션·가격" },
    { id: "shelf", label: "C · 진열대기" },
  ];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-line bg-paper p-4">
        <h1 className="text-balance font-display text-[22px] font-semibold">Export · 진열대기</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-dim">
          PDP에서 보낸 제작목록 → 옵션·판매가 확정 → 진열대기 → 채널 송출.{" "}
          <Link href="/hq/pipeline/pdp" className="underline">
            PDP로 이동
          </Link>
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? btnCoral : btnGhost}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <p className="rounded-lg bg-fog px-3 py-2 text-[12px] text-dim">{msg}</p>}
      {counts}

      <div className="flex flex-wrap gap-2">
        {tab === "crafted" && (
          <button
            type="button"
            className={btn}
            disabled={!selected.length || !!busy}
            onClick={() => {
              const row = items.find((i) => selected.includes(i.id));
              if (row) {
                setTab("priced");
                void openPrice(row);
              }
            }}
          >
            옵션·가격으로 ({selected.length})
          </button>
        )}
        {tab === "priced" && (
          <>
            <button type="button" className={btn} disabled={!editId || !!busy} onClick={() => void savePriced()}>
              가격 확정
            </button>
            <button type="button" className={btnCoral} disabled={!!busy} onClick={() => void promote()}>
              진열대기로
            </button>
          </>
        )}
        {tab === "shelf" && (
          <button
            type="button"
            className={btnCoral}
            disabled={!selected.length || !!busy}
            onClick={() => void exportSelected()}
          >
            채널 송출 ({selected.length})
          </button>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((row) => {
          const on = selected.includes(row.id) || editId === row.id;
          return (
            <li key={row.id}>
              <label
                className={`flex cursor-pointer gap-2 rounded-xl border p-2 text-[12px] ${
                  on ? "border-coral bg-coral/5" : "border-line"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(row.id) ? prev.filter((x) => x !== row.id) : [...prev, row.id],
                    )
                  }
                />
                {row.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.thumbUrl} alt="" className="size-14 rounded object-cover" />
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (tab === "priced" || tab === "crafted") void openPrice(row);
                    else setEditId(row.id);
                  }}
                >
                  <span className="line-clamp-2 font-medium">
                    {row.titleKo || row.title || `#${row.id}`}
                  </span>
                  {row.titleKo && row.title && (
                    <span className="mt-0.5 block line-clamp-1 text-[10px] text-dim">{row.title}</span>
                  )}
                  <span className="mt-0.5 block text-[10px] text-dim">
                    doc #{row.documentId}
                    {row.sellPriceUsd ? ` · $${row.sellPriceUsd}` : ""}
                    {` · 재고 ${row.stockDefault}`}
                  </span>
                </button>
              </label>
            </li>
          );
        })}
      </ul>

      {!items.length && (
        <p className="py-10 text-center text-[13px] text-dim">
          {tab === "crafted"
            ? "제작목록이 비어 있습니다. PDP에서 「Export 보내기」로 문서를 보내세요."
            : "이 단계에 항목이 없습니다."}
        </p>
      )}

      {(tab === "priced" || tab === "shelf") && editId && (
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[12px] font-bold">옵션 · 가격 · 채널</p>
          <p className="mt-1 text-[11px] text-dim">
            판매가 = (원가 + 20) × 1.3 · 재고 기본 10
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-[12px]">
              <span className="font-bold text-dim">판매가 USD</span>
              <input
                className="rounded-lg border border-line px-2 py-2"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-[12px]">
              <span className="font-bold text-dim">기본 재고</span>
              <input
                type="number"
                className="rounded-lg border border-line px-2 py-2"
                value={stockDefault}
                onChange={(e) => setStockDefault(Number(e.target.value) || 10)}
              />
            </label>
          </div>
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-[12px]">
            {options.map((o, i) => (
              <li key={`${o.sku ?? o.name}-${i}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-medium">{o.name}</span>
                <input
                  type="number"
                  className="w-20 rounded border border-line px-1 py-1"
                  value={o.stock}
                  onChange={(e) => {
                    const stock = Number(e.target.value) || 0;
                    setOptions((prev) => prev.map((x, j) => (j === i ? { ...x, stock } : x)));
                  }}
                />
                {o.costUsd != null && <span className="text-[10px] text-dim">cost ${o.costUsd}</span>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={channels.includes(c)}
                  onChange={() =>
                    setChannels((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                    )
                  }
                />
                {c}
              </label>
            ))}
          </div>
          {tab === "priced" && (
            <button type="button" className={`${btn} mt-3`} disabled={!!busy} onClick={() => void savePriced()}>
              저장 · 가격 확정
            </button>
          )}
        </div>
      )}
    </div>
  );
}
