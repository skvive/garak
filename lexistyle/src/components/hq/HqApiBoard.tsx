"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";

async function hq(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api/hq${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

export function HqApiBoard({
  title,
  description,
  loadPath,
  listKey,
  actions,
}: {
  title: string;
  description?: string;
  loadPath: string;
  listKey: string;
  actions?: { label: string; method?: string; path: string; body?: unknown }[];
}) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [raw, setRaw] = useState<unknown>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const data = await hq(loadPath);
      setRaw(data);
      const list = (data as Record<string, unknown>)[listKey];
      setRows(Array.isArray(list) ? list : Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [loadPath, listKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold">{title}</h1>
          {description && <p className="mt-1 text-[13px] text-dim">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold disabled:opacity-40"
            onClick={() => void load()}
          >
            새로고침
          </button>
        </div>
      </div>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={busy}
              className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    const r = await hq(a.path, a.method ?? "POST", a.body);
                    setMsg(`✓ ${a.label}: ${JSON.stringify(r).slice(0, 160)}`);
                    await load();
                  } catch (e) {
                    setMsg(`✖ ${e instanceof Error ? e.message : "failed"}`);
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {msg && <p className="rounded-lg bg-fog px-3 py-2 text-[12px] text-dim">{msg}</p>}
      <div className="overflow-auto rounded-2xl border border-line bg-paper">
        <pre className="max-h-[480px] overflow-auto p-4 text-[11px] leading-relaxed text-dim">
          {JSON.stringify(rows.length ? rows : raw, null, 2)}
        </pre>
      </div>
    </div>
  );
}
