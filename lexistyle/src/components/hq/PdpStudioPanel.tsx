"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Factory, Loader2, Lock, Monitor, Save, Smartphone, Tablet, Upload, Wand2 } from "lucide-react";
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import { defaultConceptSpec, patchConceptFromChat } from "@/lib/pdp/concept-spec";
import type { PdpStructured } from "@/lib/pdp/ruleset";

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_W: Record<Device, number> = { desktop: 1024, tablet: 768, mobile: 390 };

type SeedCatalog = {
  id: number;
  title: string;
  categoryPath?: string[] | null;
  minPrice?: string | null;
  currency: string;
  primaryThumbUrl?: string | null;
};

type GoldenTemplate = {
  id: number;
  name: string;
  locked?: boolean;
  conceptSpec?: ConceptSpec;
};

const MARKETING_ACT_LABELS = ["히어로", "매크로", "신뢰"] as const;

function marketingActLabels(count: number): string {
  return MARKETING_ACT_LABELS.slice(0, Math.min(count, 3)).join(" · ");
}

export function PdpStudioPanel({
  seedCatalog,
  factoryCatalogIds,
  onFactoryDone,
}: {
  seedCatalog: SeedCatalog | null;
  factoryCatalogIds: number[];
  onFactoryDone?: () => void;
}) {
  const [concept, setConcept] = useState<ConceptSpec>(() =>
    defaultConceptSpec(seedCatalog?.id, seedCatalog?.title),
  );
  const [chat, setChat] = useState("");
  const [genImage, setGenImage] = useState(true);
  const [dummy, setDummy] = useState(true);
  const [device, setDevice] = useState<Device>("desktop");
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [busy, setBusy] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ pct: number; etaSec: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ html: string; engine: string; imageMock?: boolean } | null>(null);
  const [structured, setStructured] = useState<PdpStructured | null>(null);
  const [assetUrls, setAssetUrls] = useState<string[]>([]);
  const [templates, setTemplates] = useState<GoldenTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [batch, setBatch] = useState<Record<string, unknown> | null>(null);
  /** 저장된 문서 id — 있어야 "출력"(쇼핑몰 반영)을 누를 수 있다. 저장 후 문구를 또 고치면 다시 저장해야 한다 */
  const [savedDocId, setSavedDocId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const lockedTemplate = templates.find((t) => t.id === activeTemplateId && t.locked);

  const loadTemplates = useCallback(async () => {
    const r = await fetch("/api/hq/factory/templates");
    const d = await r.json();
    setTemplates((d.templates as GoldenTemplate[]) ?? []);
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (seedCatalog) {
      setConcept(defaultConceptSpec(seedCatalog.id, seedCatalog.title));
      setResult(null);
      setStructured(null);
      setAssetUrls([]);
      setMsg(null);
      setSavedDocId(null);
      setDirty(false);
    }
  }, [seedCatalog?.id]);

  const renderPreview = useCallback(
    async (nextConcept: ConceptSpec, nextStructured: PdpStructured, urls: string[]) => {
      setBusy("render");
      try {
        const r = await fetch("/api/hq/studio/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ structured: nextStructured, conceptSpec: nextConcept, assetUrls: urls }),
        });
        const d = await r.json();
        if (!r.ok) {
          setMsg(d.error ?? "미리보기 갱신 실패");
          return false;
        }
        setResult((prev) => ({ html: d.html as string, engine: prev?.engine ?? "render", imageMock: prev?.imageMock }));
        return true;
      } catch {
        setMsg("네트워크 오류");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const generate = async () => {
    if (!seedCatalog) {
      setMsg("스튜디오 대기열에서 시드 상품 1건을 선택하세요");
      return;
    }
    setBusy("gen");
    setMsg(null);
    setViewMode("preview");
    const started = Date.now();
    let tick: ReturnType<typeof setInterval> | null = null;
    const bump = (pct: number) => {
      const elapsed = (Date.now() - started) / 1000;
      const etaSec = pct >= 99 ? 0 : Math.max(1, Math.round((elapsed / Math.max(pct, 1)) * (100 - pct)));
      setGenProgress({ pct, etaSec });
    };
    bump(5);
    tick = setInterval(() => {
      setGenProgress((prev) => {
        if (!prev || prev.pct >= 90) return prev;
        const pct = Math.min(90, prev.pct + 3);
        const elapsed = (Date.now() - started) / 1000;
        const etaSec = Math.max(1, Math.round((elapsed / Math.max(pct, 1)) * (100 - pct)));
        return { pct, etaSec };
      });
    }, 800);
    try {
      const nextConcept: ConceptSpec = {
        ...concept,
        imageRecipe: { ...concept.imageRecipe, generate: genImage },
      };
      setConcept(nextConcept);
      bump(15);
      const r = await fetch("/api/hq/studio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogId: seedCatalog.id,
          productName: seedCatalog.title,
          category: seedCatalog.categoryPath?.slice(-1)?.[0] ?? "Lifestyle",
          price: `${seedCatalog.currency} ${seedCatalog.minPrice ?? "0"}`,
          generateImage: genImage,
          conceptSpec: nextConcept,
          imageUrls: seedCatalog.primaryThumbUrl ? [seedCatalog.primaryThumbUrl] : [],
        }),
      });
      bump(85);
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "생성 실패");
        return;
      }
      const urls = Array.isArray(d.assetUrls) ? (d.assetUrls as string[]) : [];
      setResult({ html: d.html, engine: d.engine, imageMock: d.imageMock });
      setStructured(d.structured as PdpStructured);
      setAssetUrls(urls);
      setDirty(true); // 새로 생성된 문구는 저장해야 출력할 수 있다
      if (d.conceptSpec) setConcept(d.conceptSpec as ConceptSpec);
      bump(100);
      const imgCount = urls.length;
      const imgNote = genImage
        ? d.imageError
          ? ` · 이미지 ${imgCount}/3 · 실패→폴백 (${String(d.imageError).slice(0, 80)})`
          : d.imageMock
            ? ` · 이미지 ${imgCount}/3 mock`
            : ` · 이미지 ${imgCount}/3`
        : "";
      setMsg(`미리보기 · ${d.engine}${imgNote}`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      if (tick) clearInterval(tick);
      setBusy(null);
      setTimeout(() => setGenProgress(null), 600);
    }
  };

  /** 수정: 지시문대로 AI가 상세페이지 문구를 고치고(+레이아웃 키워드는 컨셉에 반영) 미리보기를 갱신한다 */
  const applyChat = async () => {
    const trimmed = chat.trim();
    if (!trimmed) return;
    if (!structured) {
      setMsg("먼저 상품페이지를 생성한 뒤 수정하세요");
      return;
    }
    setBusy("patch");
    setMsg(null);
    try {
      // 1) 레이아웃·톤 키워드는 컨셉에 반영 (템플릿 선택 시 템플릿에도 반영)
      let nextConcept = patchConceptFromChat(concept, trimmed);
      if (activeTemplateId) {
        const rt = await fetch(`/api/hq/factory/templates/${activeTemplateId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat: trimmed }),
        });
        const dt = await rt.json().catch(() => ({}));
        if (rt.ok && dt.template) {
          nextConcept = (dt.template as GoldenTemplate).conceptSpec ?? nextConcept;
          void loadTemplates();
        }
      }
      setConcept(nextConcept);

      // 2) 문구 교정은 AI 에게 지시문 그대로 전달
      const r = await fetch("/api/hq/studio/revise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ structured, conceptSpec: nextConcept, assetUrls, instruction: trimmed }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d.error ?? "수정 실패");
        return;
      }
      setStructured(d.structured as PdpStructured);
      setResult((prev) => ({ html: d.html as string, engine: prev?.engine ?? "render", imageMock: prev?.imageMock }));
      setChat("");
      setDirty(true);
      setMsg(`수정 완료 (${d.engine}) · 마음에 들면 저장 → 출력을 누르세요`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const refreshPreview = async (nextConcept: ConceptSpec) => {
    if (!structured) {
      setMsg("먼저 미리보기를 생성하세요");
      return;
    }
    const ok = await renderPreview(nextConcept, structured, assetUrls);
    if (ok) setMsg("미리보기 갱신됨");
  };

  const saveTemplate = async () => {
    if (!result) {
      setMsg("먼저 미리보기를 생성하세요");
      return;
    }
    setBusy("save");
    try {
      const r = await fetch("/api/hq/factory/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${seedCatalog?.title?.slice(0, 40) ?? "무제"} 컨셉`,
          createdFromPrompt: concept.voice,
          ...concept,
          conceptSpec: { ...concept, seedCatalogId: seedCatalog?.id },
          imageRecipe: concept.imageRecipe,
          tokens: concept.tokens,
          blockPlan: concept.blockPlan,
          copyRuleset: concept.copyRuleset,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "저장 실패");
        return;
      }
      const t = d.template as GoldenTemplate;
      setActiveTemplateId(t.id);
      setMsg(`골든 템플릿 #${t.id} 저장 (잠금 전)`);
      void loadTemplates();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const lockTemplate = async () => {
    if (!activeTemplateId) {
      setMsg("저장된 템플릿을 선택하세요");
      return;
    }
    setBusy("lock");
    try {
      const r = await fetch(`/api/hq/factory/templates/${activeTemplateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lock: true, conceptSpec: concept }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "잠금 실패");
        return;
      }
      setMsg(`템플릿 #${activeTemplateId} 잠금 — 공장 실행 가능`);
      void loadTemplates();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  /** 미리보기 컨셉을 content_documents에 저장 → Export 대기열 */
  const saveDocument = async () => {
    if (!seedCatalog) {
      setMsg("시드 상품이 필요합니다");
      return;
    }
    setBusy("doc");
    try {
      const r = await fetch("/api/hq/pdp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogId: seedCatalog.id,
          locale: concept.locale ?? "ko",
          conceptSpec: { ...concept, seedCatalogId: seedCatalog.id },
          assetUrls: assetUrls.length ? assetUrls : undefined,
          // 화면에서 교정한 문구를 그대로 저장 (없으면 서버가 새로 생성)
          structured: structured ?? undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "문서 저장 실패");
        return;
      }
      setSavedDocId(d.documentId as number);
      setDirty(false);
      setMsg(`문서 #${d.documentId} 저장됨 (v${d.version} · ${d.engine}) · 쇼핑몰에 반영하려면 「출력」을 누르세요`);
      onFactoryDone?.();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  /** 출력: 저장된 문서를 쇼핑몰 상품페이지에 반영 */
  const publishDocument = async () => {
    if (!savedDocId) {
      setMsg("먼저 저장하세요");
      return;
    }
    setBusy("publish");
    try {
      const r = await fetch(`/api/hq/pdp/${savedDocId}/publish`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d.error ?? "출력 실패");
        return;
      }
      setMsg(`쇼핑몰에 반영됨 · ${d.url}`);
      onFactoryDone?.();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const runFactory = async () => {
    if (!lockedTemplate) {
      setMsg("잠긴 템플릿이 필요합니다 — [컨셉 확정] 후 실행");
      return;
    }
    const ids = factoryCatalogIds.length ? factoryCatalogIds : seedCatalog ? [seedCatalog.id] : [];
    if (!ids.length) {
      setMsg("공장 대상 catalogId를 선택하세요");
      return;
    }
    setBusy("factory");
    setBatch(null);
    try {
      const r = await fetch("/api/hq/factory/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: lockedTemplate.id, catalogIds: ids, concurrency: 5, locale: concept.locale ?? "ko", skipExisting: true }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "공장 실행 실패");
        return;
      }
      setBatch(d.batch as Record<string, unknown>);
      setMsg(`공장 완료 · ok ${String((d.batch as { ok?: number }).ok)}/${String((d.batch as { total?: number }).total)}`);
      onFactoryDone?.();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const previewHtml = result?.html
    ? dummy
      ? result.html
      : result.html.replace(/https:\/\/picsum\.photos[^"')\s]*/g, "")
    : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <section className="rounded-2xl border border-line bg-paper p-4">
        <span className="text-[10px] font-bold tracking-wide text-coral">STEP 1 — PROMPT</span>
        {seedCatalog ? (
          <p className="mt-1 text-[12px] leading-relaxed text-dim">
            시드 #{seedCatalog.id} · {seedCatalog.title.slice(0, 48)}
            {seedCatalog.title.length > 48 ? "…" : ""}
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-coral">시드 상품을 선택하세요</p>
        )}

        <div className="mt-3 grid gap-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-bold text-dim">레이아웃</span>
            <select
              className="rounded-xl border border-line px-3 py-2 text-[13px]"
              value={concept.layoutId}
              onChange={(e) => {
                const next = { ...concept, layoutId: e.target.value as ConceptSpec["layoutId"] };
                setConcept(next);
                if (structured) void refreshPreview(next);
              }}
            >
              <option value="editorial-fullbleed">editorial-fullbleed</option>
              <option value="lookbook-split">lookbook-split</option>
              <option value="catalog-compact">catalog-compact</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-bold text-dim">보이스</span>
            <input
              className="rounded-xl border border-line px-3 py-2 text-[13px]"
              value={concept.voice ?? ""}
              onChange={(e) => setConcept((c) => ({ ...c, voice: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-dim">
            <input
              type="checkbox"
              checked={genImage}
              onChange={(e) => {
                const on = e.target.checked;
                setGenImage(on);
                setConcept((c) => ({ ...c, imageRecipe: { ...c.imageRecipe, generate: on } }));
              }}
            />
            AI 마케팅 이미지 3장 (히어로·매크로·신뢰)
          </label>
          <p className="text-[11px] leading-relaxed text-dim">
            체크 후 「생성」을 누르면 Act1 히어로 · Act2 매크로 · Act3 신뢰 이미지 3장을 만들고 오른쪽 미리보기에
            상세페이지가 표시됩니다. 원본 제목은 시드에 고정됩니다. 키 없으면 mock 이미지.
          </p>
          <button type="button" disabled={!seedCatalog || busy === "gen"} onClick={generate} className={primaryBtn}>
            {busy === "gen" ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}{" "}
            {busy === "gen" && genProgress
              ? `생성 · 진행률 ${genProgress.pct}% · 예상 ${genProgress.etaSec}s`
              : "생성"}
          </button>
          {assetUrls.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-dim">마케팅 컷</span>
              {MARKETING_ACT_LABELS.slice(0, Math.min(assetUrls.length, 3)).map((label) => (
                <span key={label} className="rounded-full border border-line bg-fog px-2 py-0.5 text-[10px] font-bold text-dim">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="mt-5 block text-[10px] font-bold tracking-wide text-coral">STEP 2 — ITERATE</span>
        <div className="mt-2 grid gap-2">
          <textarea
            className="min-h-[72px] rounded-xl border border-line px-3 py-2 text-[13px] leading-relaxed"
            placeholder="수정할 내용을 구체적으로 적으세요. 예: 제목을 '여름 린넨 원피스'로 바꾸고, 소재 설명에 면 100%를 추가해줘"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
          />
          <button type="button" disabled={!chat.trim() || busy === "patch" || busy === "render"} onClick={applyChat} className={secondaryBtn}>
            {busy === "patch" ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            수정
          </button>
          {structured && (
            <button
              type="button"
              disabled={busy === "render"}
              onClick={() => refreshPreview(concept)}
              className={secondaryBtn}
            >
              {busy === "render" ? <Loader2 className="size-4 animate-spin" /> : null}
              미리보기 갱신
            </button>
          )}
        </div>

        <span className="mt-5 block text-[10px] font-bold tracking-wide text-coral">STEP 3 — 저장 · LOCK · FACTORY</span>
        <div className="mt-2 grid gap-2">
          <button
            type="button"
            disabled={!seedCatalog || busy === "doc"}
            onClick={saveDocument}
            className={primaryBtn}
            title="SAMPLE3 컨셉으로 문서를 저장하고 Export 대기열에 올립니다"
          >
            {busy === "doc" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
            완료 · 문서 저장 (Export 대기)
          </button>
          <button
            type="button"
            disabled={!savedDocId || dirty || busy === "publish"}
            onClick={publishDocument}
            className={primaryBtn}
            title={!savedDocId ? "먼저 저장하세요" : dirty ? "수정 내용을 다시 저장한 뒤 출력하세요" : "저장된 상품페이지를 쇼핑몰에 반영합니다"}
          >
            {busy === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} 출력 · 쇼핑몰 반영
          </button>
          <button type="button" disabled={busy === "save"} onClick={saveTemplate} className={secondaryBtn}>
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 골든 템플릿 저장
          </button>
          {templates.length > 0 && (
            <select
              className="rounded-xl border border-line px-3 py-2 text-[12px]"
              value={activeTemplateId ?? ""}
              onChange={(e) => setActiveTemplateId(Number(e.target.value) || null)}
            >
              <option value="">템플릿 선택</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} {t.name} {t.locked ? "🔒" : ""}
                </option>
              ))}
            </select>
          )}
          <button type="button" disabled={!activeTemplateId || busy === "lock"} onClick={lockTemplate} className={secondaryBtn}>
            {busy === "lock" ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} 컨셉 확정 (잠금)
          </button>
          <button
            type="button"
            disabled={!lockedTemplate || busy === "factory"}
            onClick={runFactory}
            className={primaryBtn}
            title={lockedTemplate ? undefined : "잠긴 템플릿 필요"}
          >
            {busy === "factory" ? <Loader2 className="size-4 animate-spin" /> : <Factory className="size-4" />}
            같은 컨셉으로 N건 생성 ({factoryCatalogIds.length || (seedCatalog ? 1 : 0)})
          </button>
        </div>

        {msg && <p className="mt-3 rounded-lg bg-fog px-3 py-2 text-[12px] leading-relaxed text-dim">{msg}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-fog/40 p-4">
        <span className="text-[10px] font-bold tracking-wide text-coral">PREVIEW</span>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
              {(["preview", "html"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  aria-pressed={viewMode === m}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${viewMode === m ? "bg-coral text-white" : "text-dim"}`}
                >
                  {m === "preview" ? "프리뷰" : "HTML"}
                </button>
              ))}
            </div>
            {viewMode === "preview" && (
              <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
                {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
                  const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDevice(d)}
                      aria-pressed={device === d}
                      className={`grid size-8 place-items-center rounded-lg ${device === d ? "bg-coral text-white" : "text-dim"}`}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-dim">
            <input type="checkbox" checked={dummy} onChange={(e) => setDummy(e.target.checked)} /> Dummy
          </label>
        </div>

        <div
          className="mt-4 max-h-[min(72vh,820px)] overflow-auto rounded-xl border border-line bg-white"
          style={{ overflowX: "auto", overflowY: "auto" }}
        >
          {previewHtml ? (
            viewMode === "preview" ? (
              <div className="inline-block min-w-full p-3" style={{ minWidth: DEVICE_W[device] }}>
                <iframe
                  ref={iframeRef}
                  title="pdp-preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="block border-0 bg-white"
                  style={{
                    width: DEVICE_W[device],
                    minWidth: DEVICE_W[device],
                    height: 1400,
                    maxWidth: "none",
                  }}
                />
              </div>
            ) : (
              <pre className="m-0 min-w-full whitespace-pre p-4 text-left text-[12px] leading-relaxed text-ink">
                {previewHtml}
              </pre>
            )
          ) : (
            <div className="grid h-[420px] w-full place-items-center text-[13px] leading-relaxed text-dim">
              시드 선택 후 「생성」을 누르면 상세페이지 프리뷰·HTML이 여기에 표시됩니다
            </div>
          )}
        </div>

        {structured && (
          <p className="mt-2 text-[11px] text-dim">
            {structured.title} · USP {structured.usps?.length ?? 0} · FAQ {structured.faq?.length ?? 0}
            {assetUrls.length ? ` · 이미지 ${assetUrls.length}/3 (${marketingActLabels(assetUrls.length)})` : ""}
          </p>
        )}

        {batch && (
          <div className="mt-4 rounded-xl border border-line bg-paper p-3 text-[12px] leading-relaxed">
            배치 #{String(batch.id)} · ok {String(batch.ok)}/{String(batch.total)} · fail {String(batch.failed)} · skip{" "}
            {String(batch.skipped)}
          </div>
        )}
      </section>
    </div>
  );
}

const primaryBtn =
  "flex items-center justify-center gap-2 rounded-xl bg-coral px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50";
const secondaryBtn =
  "flex items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-[13px] font-bold disabled:opacity-50";
