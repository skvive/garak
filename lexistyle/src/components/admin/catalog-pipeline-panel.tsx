"use client";

/**
 * CJ 카탈로그 인덱스 → Import → Gemini PDP → Export 파이프라인 UI
 * 개선: 한글번역·호버썸네일·ID팝업·100개 페이지네이션
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { type ViewMode } from "@/components/hq/ViewToggle";
import { type CatalogCategory } from "@/components/hq/CategoryToggle";
import {
  PipelineProductBrowser,
  PIPELINE_PAGE_SIZE,
  type PipelineBrowserItem,
} from "@/components/hq/PipelineProductBrowser";
import { PipelineWorkProgress } from "@/components/hq/PipelineWorkProgress";
import type { PipelineProgress } from "@/lib/catalog/pipeline-progress";
import { cjProductPageUrl } from "@/lib/catalog/cj-url";
import { STOCK_ALERT_KO, type StockAlert } from "@/lib/catalog/stock-alert";
import { CjCatalogLinks } from "@/components/hq/CjCatalogLinks";
import { ExportChannelChecklist } from "@/components/hq/ExportChannelChecklist";
import type { PdpStructured } from "@/lib/pdp/ruleset";

type CatalogItem = {
  id: number;
  supplierCode: string;
  externalId: string;
  title: string;
  titleKo?: string | null;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  currency: string;
  stock: number;
  stockAlert?: StockAlert;
  warehouses?: { name: string; qty: number }[];
  importState: string;
  productId?: number | null;
  documentId?: number | null;
  primaryThumbUrl?: string | null;
  sourceUrl?: string | null;
};

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

export function CatalogPipelinePanel({
  focus = "all",
}: {
  focus?: "all" | "catalog" | "import" | "pdp" | "export";
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [stats, setStats] = useState({ total: 0, imported: 0, unknown: 0, out: 0, low: 0 });
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [previewPage, setPreviewPage] = useState<CatalogItem | null>(null);
  const [docs, setDocs] = useState<Record<string, unknown>[]>([]);
  const [exports, setExports] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [editDocId, setEditDocId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCta, setEditCta] = useState("Add to bag");
  const [editStructured, setEditStructured] = useState<PdpStructured | null>(null);
  const [editAssetCount, setEditAssetCount] = useState(0);
  const [editCatalog, setEditCatalog] = useState<{ id: number; categoryPath?: string[] | null } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [channels, setChannels] = useState<string[]>(["lexi", "coupang", "cafe24", "shopify", "amazon_au", "shopee"]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [stockAlert, setStockAlert] = useState<StockAlert | "">("");
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [refreshProg, setRefreshProg] = useState<{ done: number; total: number | null } | null>(null);
  const defaultView: ViewMode = focus === "export" ? "list" : "grid";
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const PAGE_SIZE = PIPELINE_PAGE_SIZE;
  const viewKey = `lexi-hq-pipeline-view:${focus}`;
  const page = Math.floor(cursor / PAGE_SIZE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(viewKey);
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch {
      /* private mode */
    }
  }, [viewKey]);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(viewKey, mode);
    } catch {
      /* private mode */
    }
  };

  const load = useCallback(async (query = q, cur = cursor, mode = viewMode, cats = selectedCats, alert = stockAlert) => {
    const thumb = "&thumb=1";
    const catQ = cats.length ? `&category=${encodeURIComponent(cats.join(","))}` : "";
    const alertQ = alert ? `&stockAlert=${alert}` : "";
    // focus에 따라 완전히 다른 데이터 소스 사용
    if (focus === "import") {
      const data = await hq(`/catalog?supplier=cjdropshipping&importState=imported&limit=${PAGE_SIZE}&cursor=${cur}${query ? `&q=${encodeURIComponent(query)}` : ""}${thumb}${catQ}${alertQ}`);
      setItems((data.items as CatalogItem[]) ?? []);
      setStats(data.stats ?? { total: 0, imported: 0, out: 0, low: 0 });
      setHasMore((data.items as CatalogItem[] ?? []).length >= PAGE_SIZE);
    } else if (focus === "pdp") {
      const data = await hq(`/pdp`);
      setDocs((data.documents as Record<string, unknown>[]) ?? []);
    } else if (focus === "export") {
      // 진열용 = HQ 스튜디오 AI 생성 PDP만
      const data = await hq("/pdp?shelf=1");
      setDocs((data.documents as Record<string, unknown>[]) ?? []);
      setExports([]);
    } else {
      const data = await hq(`/catalog?supplier=cjdropshipping&limit=${PAGE_SIZE}&cursor=${cur}${query ? `&q=${encodeURIComponent(query)}` : ""}${thumb}${catQ}${alertQ}`);
      setItems((data.items as CatalogItem[]) ?? []);
      setStats(data.stats ?? { total: 0, imported: 0, out: 0, low: 0 });
      setHasMore((data.items as CatalogItem[] ?? []).length >= PAGE_SIZE);
    }
  }, [q, cursor, viewMode, focus, selectedCats, stockAlert, PAGE_SIZE]);

  const loadDocs = useCallback(async () => {
    const data = await hq("/pdp");
    setDocs((data.documents as Record<string, unknown>[]) ?? []);
  }, []);

  const loadExports = useCallback(async () => {
    const data = await hq("/export");
    setExports((data.jobs as Record<string, unknown>[]) ?? []);
  }, []);

  const loadProgress = useCallback(async () => {
    const data = await hq("/pipeline/progress");
    setProgress(data as PipelineProgress);
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await hq("/catalog/categories?supplier=cjdropshipping");
    setCategories((data.categories as CatalogCategory[]) ?? []);
  }, []);

  const hydrateDoc = useCallback(async (id: number) => {
    setDocLoading(true);
    setEditStructured(null);
    setEditAssetCount(0);
    setEditCatalog(null);
    try {
      const data = await hq(`/pdp/${id}`);
      const doc = data.document as Record<string, unknown>;
      const body = (doc.body ?? {}) as { structured?: PdpStructured; assetUrls?: string[]; catalogId?: number };
      const structured = body.structured ?? null;
      setEditTitle(String(doc.title ?? structured?.title ?? ""));
      setEditCta(structured?.ctaLabel ?? "Add to bag");
      setEditStructured(structured);
      setEditAssetCount(Array.isArray(body.assetUrls) ? body.assetUrls.length : 0);
      const catalog = data.catalog as { id: number; categoryPath?: string[] | null } | null;
      setEditCatalog(catalog ?? (body.catalogId ? { id: body.catalogId, categoryPath: null } : null));
    } finally {
      setDocLoading(false);
    }
  }, []);

  const clearDocEdit = useCallback(() => {
    setEditDocId(null);
    setEditTitle("");
    setEditCta("Add to bag");
    setEditStructured(null);
    setEditAssetCount(0);
    setEditCatalog(null);
  }, []);

  useEffect(() => {
    void load();
    void loadDocs();
    void loadExports();
    void loadProgress();
    void loadCategories();
  }, [load, loadDocs, loadExports, loadProgress, loadCategories]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setMsg("");
    try {
      const r = await fn();
      setMsg(`✓ ${label}: ${JSON.stringify(r).slice(0, 220)}`);
      await load();
      await loadDocs();
      await loadExports();
      await loadProgress();
      await loadCategories();
    } catch (e) {
      setMsg(`✖ ${label}: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setBusy("");
    }
  };

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const qn = q.trim().toLowerCase();
  const visibleDocs = qn
    ? docs.filter((d) => {
        const title = String(d.title ?? "");
        const titleKo = String(d.titleKo ?? "");
        return (
          title.toLowerCase().includes(qn) ||
          titleKo.toLowerCase().includes(qn) ||
          String(d.id).includes(qn)
        );
      })
    : docs;
  const visibleExports = qn
    ? exports.filter((j) => `${j.channelCode ?? ""} ${j.externalRef ?? ""} ${j.status ?? ""}`.toLowerCase().includes(qn))
    : exports;

  const pagedDocs = visibleDocs.slice(cursor, cursor + PAGE_SIZE);
  const pagedExports = visibleExports.slice(cursor, cursor + PAGE_SIZE);
  const docsHasMore = cursor + PAGE_SIZE < visibleDocs.length;
  const exportsHasMore = cursor + PAGE_SIZE < visibleExports.length;

  const catalogBrowserItems: PipelineBrowserItem[] = items.map((it) => ({
    id: it.id,
    title: it.title,
    titleKo: it.titleKo,
    thumbUrl: it.primaryThumbUrl,
    meta: `#${it.id} · ${it.currency} ${it.minPrice ?? "—"}`,
    badge:
      it.stockAlert && it.stockAlert !== "ok"
        ? it.stockAlert === "unknown"
          ? "미확인"
          : `${STOCK_ALERT_KO[it.stockAlert]} ${it.stock}`
        : it.importState !== "none"
          ? it.importState
          : undefined,
  }));

  const docBrowserItems: PipelineBrowserItem[] = pagedDocs.map((doc) => ({
    id: Number(doc.id),
    title: String(doc.title ?? ""),
    titleKo: typeof doc.titleKo === "string" ? doc.titleKo : null,
    thumbUrl: typeof doc.thumbUrl === "string" ? doc.thumbUrl : null,
    meta: `#${doc.id} · ${String(doc.engine ?? "?")} · ${String(doc.status ?? "draft")}`,
    badge: doc.catalogId ? `cat #${doc.catalogId}` : undefined,
  }));

  /** Export 탭 = 생성 PDP 문서 (잡/MOCK 아님) */
  const exportBrowserItems: PipelineBrowserItem[] = pagedDocs.map((doc) => ({
    id: Number(doc.id),
    title: String(doc.titleKo || doc.title || `PDP #${doc.id}`),
    titleKo: doc.titleKo && doc.title ? String(doc.title) : null,
    thumbUrl: typeof doc.thumbUrl === "string" ? doc.thumbUrl : null,
    meta: `doc #${doc.id} · ${String(doc.status ?? "draft")}${doc.engine ? ` · ${doc.engine}` : ""}`,
    badge: "생성완료",
  }));

  const allVisibleSelected =
    focus === "pdp" || focus === "export"
      ? pagedDocs.length > 0 && pagedDocs.every((d) => selected.includes(Number(d.id)))
      : items.length > 0 && items.every((it) => selected.includes(it.id));

  const selectAllVisible = () => {
    if (focus === "pdp" || focus === "export") {
      const ids = pagedDocs.map((d) => Number(d.id));
      setSelected((prev) =>
        allVisibleSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])),
      );
      return;
    }
    const ids = items.map((it) => it.id);
    setSelected((prev) =>
      allVisibleSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])),
    );
  };

  const fetchSuggestions = async (needle: string) => {
    const importQ = focus === "import" ? "&importState=imported" : "";
    const data = await hq(
      `/catalog?supplier=cjdropshipping&limit=8&thumb=1&q=${encodeURIComponent(needle)}${importQ}`,
    );
    return ((data.items as CatalogItem[]) ?? []).map((it) => ({
      id: it.id,
      title: it.title,
      titleKo: it.titleKo,
      thumbUrl: it.primaryThumbUrl,
    }));
  };

  const exportStructured: PdpStructured | null = editStructured
    ? { ...editStructured, title: editTitle, ctaLabel: editCta }
    : null;

  const btn = "rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-40";
  const btnGhost = "rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-40";

  return (
    <div className="mb-8 rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] font-semibold">
            {focus === "catalog"
              ? "카탈로그 인덱스"
              : focus === "import"
                ? "선택 Import"
                : focus === "pdp"
                  ? "PDP 생성·편집"
                  : focus === "export"
                    ? "진열용 상품페이지 · Export"
                    : "CJ 카탈로그 → PDP → 송출"}
          </h2>
          <p className="mt-1 text-[12px] text-dim">
            {focus === "export"
              ? `진열용 PDP ${docs.length}건 · 스튜디오 AI 생성만`
              : `인덱스 ${stats.total}건 · Import ${stats.imported}건 · 미확인 ${stats.unknown ?? 0} · 품절 ${stats.out ?? 0} · 부족 ${stats.low ?? 0}`}
          </p>
          <p className="mt-0.5 text-[11px] text-dim/80">
            갱신 = CJ 목록 메타만(재고 미확인). 품절·부족은 Import 또는 「재고경보」로 창고 수량을 받은 뒤에만 집계.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {focus === "pdp" && (
            <Link href="/hq/pipeline/pdp/preview/solid-bikini" className={btnGhost}>
              시드 HTML 미리보기
            </Link>
          )}
          {(focus === "all" || focus === "catalog") && (
            <>
              <button
                type="button"
                disabled={!!busy}
                className={btn}
                onClick={() =>
                  run("카탈로그 갱신", async () => {
                    let reset = true;
                    let done = 0;
                    let total: number | null = null;
                    setRefreshProg({ done: 0, total: null });
                    const acc = { pagesDone: 0, upserted: 0, prune: null as { deleted: number; markedGone: number } | null };
                    for (let i = 0; i < 500; i++) {
                      const r = (await hq("/catalog/crawl", "POST", {
                        supplierCode: "cjdropshipping",
                        reset,
                        pages: 2,
                      })) as {
                        pagesDone: number;
                        upserted: number;
                        seen?: number;
                        total?: number | null;
                        exhausted: boolean;
                        error?: string | null;
                        prune?: { deleted: number; markedGone: number } | null;
                      };
                      reset = false;
                      done += r.seen ?? r.upserted ?? 0;
                      if (r.total != null) total = r.total;
                      setRefreshProg({ done, total });
                      acc.pagesDone += r.pagesDone;
                      acc.upserted += r.upserted;
                      if (r.error) throw new Error(r.error);
                      if (r.exhausted) {
                        acc.prune = r.prune ?? null;
                        setRefreshProg({ done, total: total ?? done });
                        return acc;
                      }
                    }
                    throw new Error("스윕이 끝나지 않았습니다. 갱신을 다시 누르면 1페이지부터 재시작합니다.");
                  })
                }
              >
                갱신
              </button>
              {(busy === "카탈로그 갱신" || refreshProg) && (
                <span className="tabular-nums text-[12px] leading-relaxed text-dim">
                  ({refreshProg?.done ?? 0}개(갱신작업완료) / {refreshProg?.total == null ? "???" : refreshProg.total})
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {(focus === "all" || focus === "catalog" || focus === "import") && (
        <div className="mt-3">
          <CjCatalogLinks />
        </div>
      )}

      {(focus === "all" || focus === "catalog" || focus === "import") && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(["", "unknown", "out", "low", "ok"] as const).map((a) => (
            <button
              key={a || "all"}
              type="button"
              className={`rounded-full px-3 py-1 text-[13px] font-semibold ${stockAlert === a ? "bg-ink text-white" : "bg-fog text-dim"}`}
              onClick={() => {
                setStockAlert(a);
                setCursor(0);
                void load(q, 0, viewMode, selectedCats, a);
              }}
            >
              {a === "" ? "재고 전체" : STOCK_ALERT_KO[a]}
              {a === "unknown"
                ? ` (${stats.unknown ?? 0})`
                : a === "out"
                  ? ` (${stats.out ?? 0})`
                  : a === "low"
                    ? ` (${stats.low ?? 0})`
                    : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(focus === "all" || focus === "catalog") && (
          <>
            <button
              type="button"
              disabled={!!busy}
              className={btnGhost}
              onClick={() => run("더미→소싱상품 이관", () => hq("/catalog/migrate-legacy", "POST"))}
            >
              더미페이지 → 소싱상품 이관
            </button>
            <button
              type="button"
              disabled={!!busy}
              className={btnGhost}
              onClick={() => run("판매가 재계산", () => hq("/catalog/reprice", "POST"))}
            >
              판매가 공식 일괄 적용
            </button>
          </>
        )}
        {(focus === "all" || focus === "catalog" || focus === "import") && (
          <>
        <button
          type="button"
          disabled={!selected.length || !!busy}
          className={btn}
          onClick={() => run("Import", () => hq("/catalog/import", "POST", { catalogIds: selected }))}
        >
          선택 Import ({selected.length})
        </button>
        {(focus === "all" || focus === "catalog") && (
          <button
            type="button"
            disabled={!selected.length || !!busy}
            className={btnGhost}
            onClick={() => run("재고경보", () => hq("/catalog/stock-refresh", "POST", { catalogIds: selected }))}
          >
            선택 창고재고 갱신
          </button>
        )}
        <button
          type="button"
          disabled={!selected.length || !!busy}
          className={btn}
          onClick={() => run("PDP 생성", () => hq("/pdp", "POST", { catalogIds: selected }))}
        >
          상품페이지 생성
        </button>
        <button
          type="button"
          disabled={!docs.length || !!busy}
          className={btnGhost}
          onClick={() =>
            run("일괄 CTA", () =>
              hq("/pdp/batch-edit", "POST", {
                documentIds: docs.map((d) => Number(d.id)),
                ctaLabel: editCta,
                tonePrefix: "LEXI Edit ·",
              }),
            )
          }
        >
          같은규칙 일괄편집
        </button>
          </>
        )}
      </div>

      <div className="mt-4">
        <PipelineProductBrowser
          items={
            focus === "pdp" ? docBrowserItems : focus === "export" ? exportBrowserItems : catalogBrowserItems
          }
          selectedIds={selected}
          onToggle={toggle}
          onSelectAllVisible={selectAllVisible}
          allVisibleSelected={allVisibleSelected}
          viewMode={viewMode}
          onViewModeChange={changeView}
          query={q}
          onQueryChange={setQ}
          onSearch={(nextQ) => {
            const qq = nextQ ?? q;
            setQ(qq);
            setCursor(0);
            void load(qq, 0);
          }}
          fetchSuggestions={
            focus === "catalog" || focus === "import" || focus === "all" ? fetchSuggestions : undefined
          }
          categories={focus === "catalog" || focus === "import" || focus === "all" ? categories : undefined}
          selectedCategories={selectedCats}
          onCategoriesChange={
            focus === "catalog" || focus === "import" || focus === "all"
              ? (next) => {
                  setSelectedCats(next);
                  setCursor(0);
                  void load(q, 0, viewMode, next);
                }
              : undefined
          }
          page={page}
          hasMore={focus === "pdp" || focus === "export" ? docsHasMore : hasMore}
          onPageChange={(nextPage) => {
            const newCursor = Math.max(0, nextPage * PAGE_SIZE);
            setCursor(newCursor);
            if (focus !== "pdp" && focus !== "export") void load(q, newCursor);
          }}
          emptyMessage={
            focus === "pdp" ? (
              docs.length ? (
                "검색 결과가 없습니다."
              ) : (
                "PDP 문서가 없습니다. Import 후 PDP를 생성하세요."
              )
            ) : focus === "export" ? (
              docs.length ? (
                "검색 결과가 없습니다."
              ) : (
                "진열용 상품페이지가 없습니다. 스튜디오에서 AI 생성·저장 후 다시 열어 주세요."
              )
            ) : q ? (
              <>
                카탈로그에 없음.{" "}
                <Link href="/hq/cj-sourcing" className="underline">
                  소싱요청
                </Link>{" "}
                티켓을 남기세요.
                        </>
                      ) : (
                        "아직 인덱스가 없습니다. 「갱신」을 실행하세요."
            )
          }
          toolbar={
            focus === "catalog" || focus === "import" || focus === "all" ? (
                      <button
                        type="button"
                className="rounded-lg border border-line px-3 py-2 text-[12px] font-bold text-dim"
                disabled={!selected[0]}
            onClick={() => {
                  const it = items.find((x) => x.id === selected[0]);
                  if (it) setPreviewPage(it);
            }}
          >
                CJ 미리보기
          </button>
            ) : undefined
          }
        />
      </div>


      <PipelineWorkProgress focus={focus} progress={progress} busy={busy} msg={msg}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <p className="text-[12px] font-bold">상품페이지 편집</p>
          <select
            className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-[12px]"
            value={editDocId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value) || null;
              setEditDocId(id);
              if (!id) {
                clearDocEdit();
                return;
              }
              void hydrateDoc(id);
            }}
          >
            <option value="">문서 선택</option>
            {docs.map((d) => (
              <option key={String(d.id)} value={String(d.id)}>
                #{String(d.id)} {String(d.title)} ({String(d.engine ?? "?")})
              </option>
            ))}
          </select>
          <input
            className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-[12px]"
            placeholder="제목"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <input
            className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-[12px]"
            placeholder="CTA"
            value={editCta}
            onChange={(e) => setEditCta(e.target.value)}
          />
          <button
            type="button"
            disabled={!editDocId || !!busy}
            className={`${btn} mt-2`}
            onClick={() =>
              run("단건 편집", async () => {
                const r = await hq(`/pdp/${editDocId}`, "PATCH", {
                  title: editTitle,
                  structured: { title: editTitle, ctaLabel: editCta },
                  status: "review",
                });
                if (editDocId) await hydrateDoc(editDocId);
                return r;
              })
            }
          >
            저장(새 버전)
          </button>
        </div>

        <div className="rounded-xl border border-line p-3">
          <p className="text-[12px] font-bold">제품 내보내기</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {["lexi", "coupang", "cafe24", "shopify", "amazon_au", "shopee", "alibaba_package"].map((c) => (
              <label key={c} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={channels.includes(c)}
                  onChange={() =>
                    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                  }
                />
                {c}
              </label>
            ))}
          </div>
          {docLoading && (
            <p className="mt-2 text-[11px] text-dim">문서 불러오는 중…</p>
          )}
          {editDocId && exportStructured && !docLoading && (
            <div className="mt-3">
              <ExportChannelChecklist
                channels={channels}
                structured={exportStructured}
                catalog={editCatalog}
                assetCount={editAssetCount}
              />
            </div>
          )}
          <button
            type="button"
            disabled={(!selected.length && !editDocId) || !channels.length || !!busy}
            className={`${btn} mt-2`}
            onClick={() =>
              run("Export", async () => {
                const ids = selected.length ? selected : editDocId ? [editDocId] : [];
                if (!ids.length) throw new Error("문서를 선택하세요");
                for (const documentId of ids) {
                  await hq("/export", "POST", { documentId, channels });
                }
                const jobs = await hq("/export");
                setExports((jobs.jobs as Record<string, unknown>[]) ?? []);
              })
            }
          >
            선택 문서 송출 ({selected.length || (editDocId ? 1 : 0)})
          </button>
          <p className="mt-2 text-[11px] text-dim">
            <Link href="/hq/pipeline/export/shelf" className="underline">
              옵션·가격 · 진열대기
            </Link>
          </p>
          <ul className="mt-2 max-h-28 overflow-auto text-[11px] text-dim">
            {exports
              .filter((j) => !/MOCK/i.test(String(j.externalRef ?? "")))
              .slice(0, 8)
              .map((j) => (
              <li key={String(j.id)}>
                #{String(j.id)} {String(j.channelCode)} · {String(j.status)} · {String(j.externalRef ?? "")}
              </li>
            ))}
          </ul>
        </div>
      </div>
      </PipelineWorkProgress>

      {previewPage && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="CJ 상품페이지">
          <button type="button" aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={() => setPreviewPage(null)} />
          <div className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="text-balance text-[15px] font-bold">파이프라인에서 불러오기</p>
                <p className="truncate text-[12px] leading-relaxed text-dim">{previewPage.title}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={cjProductPageUrl(previewPage.sourceUrl, previewPage.externalId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btn}
                >
                  새 탭
                </a>
                <button type="button" className={btnGhost} onClick={() => setPreviewPage(null)}>
                  닫기
                </button>
              </div>
            </div>
            <iframe
              title="CJ 상품페이지"
              src={cjProductPageUrl(previewPage.sourceUrl, previewPage.externalId)}
              className="min-h-0 w-full flex-1 bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
