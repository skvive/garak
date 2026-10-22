"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import type { BookmarkStatus } from "@/lib/hq/types";

type Tab = BookmarkStatus | "add";

type Product = {
  id: number;
  title: string;
  thumbUrl?: string | null;
  price?: string | null;
  currency?: string;
  categoryPath: string[];
  sellerName?: string | null;
  externalId?: string;
};

type Row = {
  id: number;
  catalogId: number;
  status: BookmarkStatus;
  groupName?: string;
  note?: string;
  createdAt: string;
  product: Product | null;
};

type HotProduct = Product & { hotScore: number; stock: number };

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

const TABS: { id: Tab; label: string }[] = [
  { id: "bookmarked", label: "컬렉션" },
  { id: "archived", label: "보관함" },
  { id: "trash", label: "휴지통" },
  { id: "add", label: "담기" },
];

export function MyCollections() {
  const [tab, setTab] = useState<Tab>("bookmarked");
  const [rows, setRows] = useState<Row[]>([]);
  const [hot, setHot] = useState<HotProduct[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState({ bookmarked: 0, archived: 0, trash: 0 });
  const [groupName, setGroupName] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [addQ, setAddQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      if (tab === "add") {
        const q = addQ.trim() ? `&q=${encodeURIComponent(addQ.trim())}` : "";
        const data = await api(`/bookmarks/hot?limit=24${q}`);
        setHot((data.products as HotProduct[]) ?? []);
        setSelected([]);
      } else {
        const params = new URLSearchParams({ status: tab });
        if (groupFilter) params.set("group", groupFilter);
        if (categoryFilter) params.set("category", categoryFilter);
        const data = await api(`/bookmarks?${params}`);
        setRows((data.bookmarks as Row[]) ?? []);
        setGroups((data.groups as string[]) ?? []);
        setCategories((data.categories as string[]) ?? []);
        setCounts((data.counts as { bookmarked: number; archived: number; trash: number }) ?? {
          bookmarked: 0,
          archived: 0,
          trash: 0,
        });
        setSelected([]);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, [tab, groupFilter, categoryFilter, addQ]);

  useEffect(() => {
    void load();
  }, [tab, groupFilter, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps -- addQ는 검색 버튼으로만

  const run = async (label: string, body: Record<string, unknown>) => {
    setMsg("");
    setBusy(true);
    try {
      await api("/bookmarks", "POST", body);
      setMsg(`✓ ${label}`);
      setSelected([]);
      await load();
    } catch (e) {
      setMsg(`✖ ${label}: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setBusy(false);
    }
  };

  const selectedIds = tab === "add" ? selected : rows.filter((r) => selected.includes(r.catalogId)).map((r) => r.catalogId);
  const ids = selectedIds.length ? selectedIds : [];

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const visibleIds = tab === "add" ? hot.map((p) => p.id) : rows.map((r) => r.catalogId);
  const allOn = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const groupChips = useMemo(() => ["", ...groups], [groups]);

  const btn = "rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-40";
  const btnGhost = "rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-40";

  const productCard = (p: Product | null, catalogId: number, extra?: { group?: string; score?: number }) => {
    const title = p?.title ?? `#${catalogId}`;
    const checked = selected.includes(catalogId);
    return (
      <div
        key={catalogId}
        className={`overflow-hidden rounded-2xl border bg-paper transition-shadow ${
          checked ? "border-coral ring-1 ring-coral/30" : "border-line"
        }`}
      >
        <button type="button" className="relative block w-full text-left" onClick={() => toggle(catalogId)}>
          <div className="aspect-square bg-fog">
            {p?.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-dim">이미지 없음</div>
            )}
            <span
              className={`absolute left-2 top-2 flex size-5 items-center justify-center rounded border text-[11px] font-bold ${
                checked ? "border-coral bg-coral text-white" : "border-line bg-white/90 text-transparent"
              }`}
            >
              ✓
            </span>
            {extra?.score != null && (
              <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {extra.score}
              </span>
            )}
          </div>
          <div className="p-2.5 text-[13px] leading-[1.6]">
            <p className="line-clamp-2 min-h-[2.6em] font-medium">{title}</p>
            <p className="mt-1 text-[12px] text-dim">{(p?.categoryPath ?? []).slice(0, 2).join(" › ") || "—"}</p>
            {extra?.group && <p className="text-[12px] text-dim">그룹 {extra.group}</p>}
            <p className="mt-1 font-bold tabular-nums">
              {p?.currency ?? "USD"} {p?.price ?? "—"}
            </p>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-balance text-[24px] font-semibold">마이 컬렉션</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            계정별 상품 작업함 · 그룹으로 배치하고 카테고리로 걸러 목록/그리드로 봅니다
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      <div className="flex flex-wrap gap-1 rounded-full border border-line bg-fog p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelected([]);
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${
              tab === t.id ? "bg-ink text-white" : "text-dim"
            }`}
          >
            {t.label}
            {t.id !== "add" && counts[t.id] > 0 ? ` ${counts[t.id]}` : ""}
          </button>
        ))}
      </div>

      {tab !== "add" && (
        <div className="flex flex-wrap gap-2">
          {groupChips.map((g) => (
            <button
              key={g || "all"}
              type="button"
              onClick={() => setGroupFilter(g)}
              className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
                groupFilter === g ? "border-ink bg-ink text-white" : "border-line text-dim"
              }`}
            >
              {g || "전체 그룹"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setGroupFilter("__none")}
            className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
              groupFilter === "__none" ? "border-ink bg-ink text-white" : "border-line text-dim"
            }`}
          >
            미분류
          </button>
        </div>
      )}

      {tab !== "add" && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("")}
            className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
              !categoryFilter ? "border-ink bg-ink text-white" : "border-line text-dim"
            }`}
          >
            전체 카테고리
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
                categoryFilter === c ? "border-ink bg-ink text-white" : "border-line text-dim"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tab === "add" ? (
          <>
            <input
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-[13px] leading-[1.6]"
              placeholder="카탈로그 검색 (제목·카테고리)"
              value={addQ}
              onChange={(e) => setAddQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
            <button type="button" className={btnGhost} disabled={busy} onClick={() => void load()}>
              검색
            </button>
          </>
        ) : (
          <input
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-[13px] leading-[1.6]"
            placeholder="그룹명 (예: 뷰티, 여름컬렉션) — 선택 상품에 적용"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        )}
      </div>

      {ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-fog px-3 py-2">
          <span className="text-[13px] font-bold">{ids.length}건 선택</span>
          {tab === "add" && (
            <button
              type="button"
              className={btn}
              disabled={busy}
              onClick={() => run("컬렉션에 담기", { catalogIds: ids, status: "bookmarked", groupName: groupName || undefined })}
            >
              컬렉션에 담기
            </button>
          )}
          {tab === "bookmarked" && (
            <>
              <button
                type="button"
                className={btnGhost}
                disabled={busy || !groupName.trim()}
                onClick={() => run("그룹 지정", { catalogIds: ids, groupName: groupName.trim() })}
              >
                그룹 지정
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => run("보관함", { catalogIds: ids, status: "archived" })}
              >
                보관함
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => run("휴지통", { catalogIds: ids, status: "trash" })}
              >
                휴지통
              </button>
            </>
          )}
          {tab === "archived" && (
            <>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => run("컬렉션 복원", { catalogIds: ids, status: "bookmarked" })}
              >
                컬렉션으로
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => run("휴지통", { catalogIds: ids, status: "trash" })}
              >
                휴지통
              </button>
            </>
          )}
          {tab === "trash" && (
            <>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => run("복원", { catalogIds: ids, status: "bookmarked" })}
              >
                컬렉션 복원
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={busy}
                onClick={() => run("보관함 이동", { catalogIds: ids, status: "archived" })}
              >
                보관함
              </button>
            </>
          )}
          <button type="button" className={btnGhost} onClick={() => setSelected([])}>
            선택 해제
          </button>
        </div>
      )}

      {msg && <p className="rounded-lg bg-fog px-3 py-2 text-[12px] leading-[1.6] text-dim">{msg}</p>}

      <label className="flex items-center gap-2 text-[13px] leading-[1.6]">
        <input
          type="checkbox"
          checked={allOn}
          onChange={() => setSelected(allOn ? [] : visibleIds)}
        />
        이 목록 전체 선택
      </label>

      {tab === "add" && viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {hot.map((p) => productCard(p, p.id, { score: p.hotScore }))}
        </div>
      )}
      {tab === "add" && viewMode === "list" && (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left">
            <thead className="bg-fog text-[12px] text-dim">
              <tr>
                <th className="p-2">선택</th>
                <th className="p-2">상품</th>
                <th className="p-2">카테고리</th>
                <th className="p-2">가격</th>
              </tr>
            </thead>
            <tbody>
              {hot.map((p) => (
                <tr key={p.id} className="border-t border-line text-[13px] leading-[1.6]">
                  <td className="p-2">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="p-2 font-medium">{p.title}</td>
                  <td className="p-2 text-dim">{p.categoryPath.slice(0, 2).join(" › ") || "—"}</td>
                  <td className="p-2 tabular-nums">
                    {p.currency} {p.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "add" && !hot.length && !busy && (
        <p className="py-8 text-center text-[13px] leading-[1.6] text-dim">
          담을 상품이 없습니다. 카탈로그 인덱스에서 수집한 뒤 여기서 선택하세요.
        </p>
      )}

      {tab !== "add" && viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((r) => productCard(r.product, r.catalogId, { group: r.groupName }))}
        </div>
      )}
      {tab !== "add" && viewMode === "list" && (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left">
            <thead className="bg-fog text-[12px] text-dim">
              <tr>
                <th className="p-2">선택</th>
                <th className="p-2">상품</th>
                <th className="p-2">그룹</th>
                <th className="p-2">카테고리</th>
                <th className="p-2">가격</th>
                <th className="p-2">날짜</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line text-[13px] leading-[1.6]">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.catalogId)}
                      onChange={() => toggle(r.catalogId)}
                    />
                  </td>
                  <td className="p-2 font-medium">{r.product?.title ?? `#${r.catalogId}`}</td>
                  <td className="p-2">{r.groupName || "—"}</td>
                  <td className="p-2 text-dim">{(r.product?.categoryPath ?? []).slice(0, 2).join(" › ") || "—"}</td>
                  <td className="p-2 tabular-nums">
                    {r.product ? `${r.product.currency} ${r.product.price}` : "—"}
                  </td>
                  <td className="p-2 text-[12px] text-dim">{r.createdAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab !== "add" && !rows.length && !busy && (
        <p className="py-8 text-center text-[13px] leading-[1.6] text-dim">
          {tab === "bookmarked"
            ? "컬렉션이 비어 있습니다. 담기 탭에서 상품을 선택해 넣으세요."
            : tab === "archived"
              ? "보관함이 비어 있습니다."
              : "휴지통이 비어 있습니다."}
        </p>
      )}
    </div>
  );
}
