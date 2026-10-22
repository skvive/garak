"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PdpStudioPanel } from "@/components/hq/PdpStudioPanel";
import { PipelineWorkProgress } from "@/components/hq/PipelineWorkProgress";
import {
  PipelineProductBrowser,
  PIPELINE_PAGE_SIZE,
  type PipelineBrowserItem,
} from "@/components/hq/PipelineProductBrowser";
import type { CatalogCategory } from "@/components/hq/CategoryToggle";
import type { ViewMode } from "@/components/hq/ViewToggle";

type CatalogItem = {
  id: number;
  title: string;
  titleKo?: string | null;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  currency: string;
  primaryThumbUrl?: string | null;
  importState: string;
  documentId?: number | null;
};

type PdpDoc = {
  id: number;
  title: string;
  status: string;
  engine?: string;
  catalogId?: number | null;
  thumbUrl?: string | null;
  currentVersion?: number;
  titleKo?: string | null;
};

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

const btn =
  "rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-paper disabled:opacity-40";
const btnCoral =
  "rounded-lg bg-coral px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40";

/**
 * HQ PDP — 세로 파이프라인
 * 1) 상품 목록 다중선택 → 스튜디오로 보내기
 * 2) 스튜디오(SAMPLE3) 수정·저장
 * 3) 생성 문서 → Export 제작목록
 */
export function HqPdpPipelinePage() {
  const [pool, setPool] = useState<CatalogItem[]>([]);
  const [selectedPool, setSelectedPool] = useState<number[]>([]);
  const [studioQueue, setStudioQueue] = useState<CatalogItem[]>([]);
  const [seedId, setSeedId] = useState<number | null>(null);
  const [factoryIds, setFactoryIds] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [docs, setDocs] = useState<PdpDoc[]>([]);
  const [exportSelected, setExportSelected] = useState<number[]>([]);
  const [docView, setDocView] = useState<ViewMode>("grid");
  const [docQ, setDocQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPool = useCallback(
    async (query = q, pageIdx = page, cats = selectedCats) => {
      const cursor = pageIdx * PIPELINE_PAGE_SIZE;
      const catQ = cats.length ? `&category=${encodeURIComponent(cats.join(","))}` : "";
      const qPart = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
      let data = await hq(
        `/catalog?supplier=cjdropshipping&importState=imported&limit=${PIPELINE_PAGE_SIZE}&cursor=${cursor}&thumb=1${qPart}${catQ}`,
      );
      let list = (data.items as CatalogItem[]) ?? [];
      if (!list.length && !query.trim() && !cats.length && pageIdx === 0) {
        data = await hq(
          `/catalog?supplier=cjdropshipping&limit=${PIPELINE_PAGE_SIZE}&cursor=${cursor}&thumb=1${qPart}${catQ}`,
        );
        list = (data.items as CatalogItem[]) ?? [];
      }
      setPool(list);
      setHasMore(list.length >= PIPELINE_PAGE_SIZE);
    },
    [q, page, selectedCats],
  );

  const loadDocs = useCallback(async () => {
    // 진열용 = HQ 스튜디오 AI 생성분만 (조회 전용 — 삭제 없음)
    const data = await hq("/pdp?shelf=1");
    setDocs((data.documents as PdpDoc[]) ?? []);
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      const data = await hq("/pipeline/progress");
      setProgress(data as Record<string, unknown>);
    } catch {
      /* optional */
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await hq("/catalog/categories?supplier=cjdropshipping");
    setCategories((data.categories as CatalogCategory[]) ?? []);
  }, []);

  useEffect(() => {
    void loadPool();
    void loadDocs();
    void loadProgress();
    void loadCategories();
  }, [loadPool, loadDocs, loadProgress, loadCategories, refreshKey]);

  const browserItems: PipelineBrowserItem[] = pool.map((it) => ({
    id: it.id,
    title: it.title,
    titleKo: it.titleKo,
    thumbUrl: it.primaryThumbUrl,
    meta: `#${it.id} · ${it.currency} ${it.minPrice ?? "—"}`,
    badge: it.documentId ? `doc #${it.documentId}` : undefined,
    cornerBadge: studioQueue.some((s) => s.id === it.id) ? "스튜디오" : undefined,
  }));

  const filteredDocs = docs.filter((d) => {
    const qq = docQ.trim().toLowerCase();
    if (!qq) return true;
    return (
      d.title.toLowerCase().includes(qq) ||
      (d.titleKo ?? "").toLowerCase().includes(qq) ||
      String(d.id).includes(qq)
    );
  });

  const docBrowserItems: PipelineBrowserItem[] = filteredDocs.map((d) => ({
    id: d.id,
    title: d.title,
    titleKo: d.titleKo,
    thumbUrl: d.thumbUrl,
    meta: `#${d.id} · ${d.status}${d.engine ? ` · ${d.engine}` : ""}`,
    badge: d.catalogId ? `cat #${d.catalogId}` : undefined,
  }));

  const allVisibleSelected = pool.length > 0 && pool.every((it) => selectedPool.includes(it.id));
  const allDocsSelected =
    filteredDocs.length > 0 && filteredDocs.every((d) => exportSelected.includes(d.id));

  const togglePool = (id: number) => {
    setSelectedPool((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    const ids = pool.map((i) => i.id);
    setSelectedPool((prev) =>
      allVisibleSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])),
    );
  };

  const toggleDoc = (id: number) => {
    setExportSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllDocs = () => {
    const ids = filteredDocs.map((d) => d.id);
    setExportSelected((prev) =>
      allDocsSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])),
    );
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
      setMsg(`${label} 완료`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sendToStudio = () => {
    const picked = pool.filter((p) => selectedPool.includes(p.id));
    if (!picked.length) return;
    setStudioQueue((prev) => {
      const map = new Map(prev.map((x) => [x.id, x]));
      for (const p of picked) map.set(p.id, p);
      return Array.from(map.values());
    });
    setSeedId((prev) => prev ?? picked[0]!.id);
    setFactoryIds((prev) => Array.from(new Set([...prev, ...picked.map((p) => p.id)])));
    setSelectedPool([]);
    requestAnimationFrame(() => {
      document.getElementById("pdp-studio-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const removeFromStudio = (id: number) => {
    setStudioQueue((prev) => prev.filter((x) => x.id !== id));
    setFactoryIds((prev) => prev.filter((x) => x !== id));
    setSeedId((prev) => (prev === id ? null : prev));
  };

  const seed = studioQueue.find((s) => s.id === seedId) ?? studioQueue[0] ?? null;

  const exportToCrafted = async () => {
    const ids = exportSelected.length ? exportSelected : [];
    if (!ids.length) throw new Error("Export할 문서를 선택하세요");
    await hq("/export/shelf", "POST", { documentIds: ids, stage: "crafted" });
  };

  const fetchSuggestions = async (query: string) => {
    const data = await hq(
      `/catalog?supplier=cjdropshipping&limit=8&thumb=1&q=${encodeURIComponent(query)}`,
    );
    return ((data.items as CatalogItem[]) ?? []).map((it) => ({
      id: it.id,
      title: it.title,
      titleKo: it.titleKo,
      thumbUrl: it.primaryThumbUrl,
    }));
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-line bg-paper p-4">
        <h1 className="text-balance font-display text-[22px] font-semibold">PDP 생성 · 스튜디오 · Export</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-dim">
          위: 상품 목록 선택 → 스튜디오로 보내기 · 중간: SAMPLE3 템플릿으로 페이지 수정 · 아래: 생성 문서 → Export 제작목록
        </p>
      </header>

      <PipelineWorkProgress focus="pdp" progress={progress as never} busy={busy ?? ""} msg={msg ?? ""}>
        <section className="rounded-2xl border border-line bg-paper p-4">
          <div className="mb-3">
            <p className="text-[10px] font-bold tracking-wide text-coral">1 · 상품 목록</p>
            <h2 className="text-[16px] font-bold">카탈로그에서 선택</h2>
          </div>

          <PipelineProductBrowser
            items={browserItems}
            selectedIds={selectedPool}
            onToggle={togglePool}
            onSelectAllVisible={selectAllVisible}
            allVisibleSelected={allVisibleSelected}
            viewMode={view}
            onViewModeChange={setView}
            query={q}
            onQueryChange={setQ}
            onSearch={(nextQ) => {
              const qq = nextQ ?? q;
              setQ(qq);
              setPage(0);
              void loadPool(qq, 0, selectedCats);
            }}
            fetchSuggestions={fetchSuggestions}
            categories={categories}
            selectedCategories={selectedCats}
            onCategoriesChange={(next) => {
              setSelectedCats(next);
              setPage(0);
              void loadPool(q, 0, next);
            }}
            page={page}
            hasMore={hasMore}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              void loadPool(q, nextPage, selectedCats);
            }}
            emptyMessage="표시할 상품이 없습니다. 카탈로그·Import 후 다시 열어 주세요."
            toolbar={
              <button
                type="button"
                className={btnCoral}
                disabled={!selectedPool.length || !!busy}
                onClick={sendToStudio}
              >
                스튜디오로 보내기 ({selectedPool.length})
              </button>
            }
          />
        </section>

        <section id="pdp-studio-section" className="mt-4 rounded-2xl border border-line bg-paper p-4">
          <p className="text-[10px] font-bold tracking-wide text-coral">2 · 스튜디오</p>
          <h2 className="text-[16px] font-bold">SAMPLE3 · linkrcode 3P</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-dim">
            대기열에서 시드 1건을 고르고 생성·수정한 뒤 「완료 · 문서 저장」으로 Export 대기열에 올립니다.
          </p>

          {studioQueue.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-fog/40 px-4 py-8 text-center text-[13px] text-dim">
              위에서 상품을 선택하고 「스튜디오로 보내기」를 누르세요.
            </p>
          ) : (
            <>
              <ul className="mt-3 flex flex-wrap gap-2">
                {studioQueue.map((it) => (
                  <li
                    key={it.id}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-[12px] ${
                      seedId === it.id ? "border-coral bg-coral/5" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="studio-seed"
                      checked={seedId === it.id}
                      onChange={() => setSeedId(it.id)}
                      aria-label={`시드 ${it.title}`}
                    />
                    <input
                      type="checkbox"
                      checked={factoryIds.includes(it.id)}
                      onChange={() =>
                        setFactoryIds((prev) =>
                          prev.includes(it.id) ? prev.filter((x) => x !== it.id) : [...prev, it.id],
                        )
                      }
                      aria-label={`공장 ${it.title}`}
                    />
                    {it.primaryThumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.primaryThumbUrl} alt="" className="size-8 rounded object-cover" />
                    )}
                    <span className="max-w-[140px] truncate font-medium">{it.titleKo || it.title}</span>
                    <button
                      type="button"
                      className="text-[11px] text-dim underline"
                      onClick={() => removeFromStudio(it.id)}
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-dim">라디오 = 시드 · 체크 = 공장 배치 대상</p>

              <div className="mt-4">
                <PdpStudioPanel
                  seedCatalog={seed}
                  factoryCatalogIds={factoryIds}
                  onFactoryDone={() => {
                    setRefreshKey((k) => k + 1);
                    void loadDocs();
                    document
                      .getElementById("pdp-export-section")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                />
              </div>
            </>
          )}
        </section>

        <section id="pdp-export-section" className="mt-4 rounded-2xl border border-line bg-paper p-4">
          <p className="text-[10px] font-bold tracking-wide text-coral">3 · Export</p>
          <h2 className="text-[16px] font-bold">진열용 상품페이지</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-dim">
            스튜디오에서 AI 생성·「완료 · 문서 저장」한 페이지만 표시합니다. template/더미는 제외됩니다.{" "}
            <Link href="/hq/pipeline/export" className="underline">
              Export 열기
            </Link>
          </p>

          <PipelineProductBrowser
            items={docBrowserItems}
            selectedIds={exportSelected}
            onToggle={toggleDoc}
            onSelectAllVisible={selectAllDocs}
            allVisibleSelected={allDocsSelected}
            viewMode={docView}
            onViewModeChange={setDocView}
            query={docQ}
            onQueryChange={setDocQ}
            onSearch={() => undefined}
            categories={[]}
            selectedCategories={[]}
            onCategoriesChange={() => undefined}
            page={0}
            hasMore={false}
            onPageChange={() => undefined}
            emptyMessage="진열용 상품페이지가 없습니다. 스튜디오에서 「생성」→「완료 · 문서 저장」을 실행하세요."
            toolbar={
              <button
                type="button"
                className={btn}
                disabled={!exportSelected.length || !!busy}
                onClick={() => run("Export 보내기", exportToCrafted)}
              >
                Export 보내기 ({exportSelected.length})
              </button>
            }
          />
        </section>
      </PipelineWorkProgress>
    </div>
  );
}
