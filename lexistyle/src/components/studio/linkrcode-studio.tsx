"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Tablet, Smartphone, Wand2, Save, Factory, Loader2 } from "lucide-react";

/**
 * linkrcode Studio — 자연어 상품페이지 생성기 (Phase 2).
 * linkrcode.ipcow.me의 3P Loop(Prompt → Preview → Publish)를 이식하고,
 * 백엔드는 lexistyle 생성 코어(/api/hq/studio/generate, /factory/*)에 연결한다.
 */

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_W: Record<Device, number> = { desktop: 1024, tablet: 768, mobile: 390 };

type GenResult = { html: string; engine: string; imageMock: boolean; assetUrls: string[] };
type GoldenTemplate = { id: number; name: string; imageRecipe?: { generate?: boolean; style?: string } };

const PROMPT_EXAMPLES = [
  { label: "글로우 세럼 · 뷰티", productName: "글로우 세럼 30ml", category: "뷰티", price: "USD 28", style: "미니멀 스튜디오, 부드러운 그림자" },
  { label: "벨벳 틴트 · 뷰티", productName: "벨벳 매트 틴트", category: "뷰티", price: "USD 16", style: "따뜻한 조명, 클로즈업" },
  { label: "무광 텀블러 · 리빙", productName: "무광 텀블러 500ml", category: "리빙", price: "USD 18", style: "미니멀 스튜디오, 부드러운 그림자" },
  { label: "니트 가디건 · 패션", productName: "오버핏 니트 가디건", category: "패션", price: "USD 42", style: "내추럴 라이트, 룩북 톤" },
];

export function LinkrcodeStudio() {
  // ── Prompt state ──
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [style, setStyle] = useState("미니멀 스튜디오, 부드러운 그림자");
  const [genImage, setGenImage] = useState(true);
  const [dummy, setDummy] = useState(true);

  // ── Preview state ──
  const [device, setDevice] = useState<Device>("desktop");
  const [result, setResult] = useState<GenResult | null>(null);
  const [busy, setBusy] = useState<null | "gen" | "save" | "factory">(null);
  const [msg, setMsg] = useState<string | null>(null);

  // ── Publish / factory state ──
  const [templates, setTemplates] = useState<GoldenTemplate[]>([]);
  const [catalogIds, setCatalogIds] = useState("");
  const [batch, setBatch] = useState<Record<string, unknown> | null>(null);

  const loadTemplates = async () => {
    try {
      const r = await fetch("/api/hq/factory/templates");
      if (r.ok) setTemplates(((await r.json()).templates ?? []) as GoldenTemplate[]);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    void loadTemplates();
  }, []);

  const generate = async () => {
    if (!productName.trim()) {
      setMsg("상품명을 입력하세요");
      return;
    }
    setBusy("gen");
    setMsg(null);
    try {
      const r = await fetch("/api/hq/studio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName,
          category: category || undefined,
          price: price || undefined,
          style,
          generateImage: genImage,
          background: "keep",
          locale: "ko",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "생성 실패");
        return;
      }
      setResult({ html: d.html, engine: d.engine, imageMock: d.imageMock, assetUrls: d.assetUrls });
      setMsg(`생성 완료 · 엔진 ${d.engine}${d.imageMock ? " · 이미지 mock" : ""}`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const saveTemplate = async () => {
    if (!result) {
      setMsg("먼저 페이지를 생성하세요");
      return;
    }
    setBusy("save");
    setMsg(null);
    try {
      const r = await fetch("/api/hq/factory/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${productName || "무제"} 템플릿`,
          createdFromPrompt: style,
          imageRecipe: { generate: genImage, style, backgroundPolicy: "keep" },
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "저장 실패");
        return;
      }
      setMsg(`골든 템플릿 #${d.template.id} 저장됨`);
      void loadTemplates();
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const runFactory = async (templateId: number) => {
    const ids = catalogIds
      .split(/[,\s]+/)
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) {
      setMsg("공장 실행: catalogId를 입력하세요 (쉼표 구분)");
      return;
    }
    setBusy("factory");
    setMsg(null);
    setBatch(null);
    try {
      const r = await fetch("/api/hq/factory/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, catalogIds: ids, concurrency: 8, locale: "ko" }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error ?? "공장 실행 실패");
        return;
      }
      setBatch(d.batch);
      setMsg(`공장 완료 · 성공 ${d.batch.ok}/${d.batch.total}`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(null);
    }
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHtml = result?.html
    ? dummy
      ? result.html
      : result.html.replace(/https:\/\/picsum\.photos[^"')\s]*/g, "")
    : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* ── 좌: Prompt ── */}
      <section className="rounded-2xl border border-line bg-paper p-4">
        <span className="text-[10px] font-bold tracking-wide text-coral">STEP 1 — PROMPT</span>
        <h3 className="flex items-center gap-2 text-[14px] font-bold">
          <Wand2 className="size-4 text-coral" /> Prompt
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROMPT_EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setProductName(ex.productName);
                setCategory(ex.category);
                setPrice(ex.price);
                setStyle(ex.style);
              }}
              className="rounded-full border border-line bg-fog px-2.5 py-1 text-[11px] font-semibold text-dim hover:bg-coral hover:text-white"
            >
              {ex.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2.5">
          <Field label="상품명 *"><input className={inputCls} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="무광 텀블러 500ml" /></Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="카테고리"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="리빙" /></Field>
            <Field label="가격"><input className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="USD 18" /></Field>
          </div>
          <Field label="스타일 (이미지·톤)"><input className={inputCls} value={style} onChange={(e) => setStyle(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-dim">
            <input type="checkbox" checked={genImage} onChange={(e) => setGenImage(e.target.checked)} /> AI 이미지 생성 (OpenAI/FLUX/mock)
          </label>
          <button type="button" disabled={busy === "gen"} onClick={generate} className={primaryBtn}>
            {busy === "gen" ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} 생성 (Prompt → Preview)
          </button>
        </div>

        {/* ── Publish / 공장 ── */}
        <span className="mt-6 block text-[10px] font-bold tracking-wide text-coral">STEP 3 — PUBLISH</span>
        <h3 className="flex items-center gap-2 text-[14px] font-bold">
          <Save className="size-4 text-coral" /> Publish · 페이지 공장
        </h3>
        <div className="mt-3 grid gap-2.5">
          <button type="button" disabled={busy === "save"} onClick={saveTemplate} className={secondaryBtn}>
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 골든 템플릿으로 저장
          </button>
          <Field label="대량 생성 대상 catalogId (쉼표 구분)"><input className={inputCls} value={catalogIds} onChange={(e) => setCatalogIds(e.target.value)} placeholder="56, 58, 59, 60" /></Field>
          {templates.length > 0 && (
            <div className="grid gap-1.5">
              <span className="text-[11px] font-bold text-dim">저장된 골든 템플릿</span>
              {templates.map((t) => (
                <button key={t.id} type="button" disabled={busy === "factory"} onClick={() => runFactory(t.id)} className={factoryBtn}>
                  <Factory className="size-3.5" /> #{t.id} {t.name} 로 대량 생성
                </button>
              ))}
            </div>
          )}
        </div>

        {msg && <p className="mt-3 rounded-lg bg-fog px-3 py-2 text-[12px] text-dim">{msg}</p>}
      </section>

      {/* ── 우: Preview ── */}
      <section className="rounded-2xl border border-line bg-fog/40 p-4">
        <span className="text-[10px] font-bold tracking-wide text-coral">STEP 2 — PREVIEW</span>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
              const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
              return (
                <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d}
                  className={`grid size-8 place-items-center rounded-lg ${device === d ? "bg-coral text-white" : "text-dim"}`}>
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-dim">
            <input type="checkbox" checked={dummy} onChange={(e) => setDummy(e.target.checked)} /> Dummy Data
          </label>
        </div>

        <div className="mt-4 flex justify-center overflow-auto">
          {previewHtml ? (
            <iframe
              ref={iframeRef}
              title="preview"
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              style={{ width: DEVICE_W[device], maxWidth: "100%", height: 720, border: "1px solid #e5e5ea", borderRadius: 14, background: "#fff" }}
            />
          ) : (
            <div className="grid h-[420px] w-full max-w-[640px] place-items-center rounded-xl border border-dashed border-line text-[13px] text-dim">
              왼쪽에서 상품명을 입력하고 &ldquo;생성&rdquo;을 누르세요
            </div>
          )}
        </div>

        {batch && (
          <div className="mt-4 rounded-xl border border-line bg-paper p-3 text-[12px]">
            <strong>공장 배치 #{String((batch as { id?: number }).id)}</strong> · 상태 {String((batch as { status?: string }).status)} · 성공 {String((batch as { ok?: number }).ok)}/{String((batch as { total?: number }).total)} · 실패 {String((batch as { failed?: number }).failed)}
          </div>
        )}
      </section>
    </div>
  );
}

const inputCls = "min-h-[40px] rounded-xl border border-line bg-paper px-3 text-[13px]";
const primaryBtn = "flex items-center justify-center gap-2 rounded-xl bg-coral px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50";
const secondaryBtn = "flex items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-[13px] font-bold disabled:opacity-50";
const factoryBtn = "flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-left text-[12px] font-semibold text-dim disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold text-dim">{label}</span>
      {children}
    </label>
  );
}
