"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Kind = "agent" | "video" | "image" | "audio" | "avatar";
type View = "create" | "explore" | "assets" | "elements" | "canvas";
type Asset = { id: number; kind: string; prompt: string; status: string; resultUrl: string | null; error: string | null };

const TABS: { id: Kind; label: string; placeholder: string }[] = [
  { id: "agent", label: "AI Agent", placeholder: "Describe your idea" },
  { id: "video", label: "AI Video", placeholder: "Describe the shot, camera, and subject" },
  { id: "image", label: "AI Image", placeholder: "Describe your image or mention elements" },
  { id: "audio", label: "AI Audio", placeholder: "Describe what should be spoken" },
  { id: "avatar", label: "AI Avatar", placeholder: "Describe the person and the look" },
];
const ELEMENTS = ["Product", "Character", "Location", "Style"];

export function StudioHome() {
  const params = useParams();
  const lng = typeof params.lng === "string" ? params.lng : "ko";
  const signIn = `/auth/sign-in?next=/${lng}/dreamina`;

  const [view, setView] = useState<View>("create");
  const [tab, setTab] = useState<Kind>("image");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Asset | null>(null);
  const [mine, setMine] = useState<Asset[]>([]);
  const [explore, setExplore] = useState<Asset[]>([]);
  const [nodes, setNodes] = useState<string[]>(["Product on a clean table"]);

  const meta = TABS.find((t) => t.id === tab)!;

  async function loadMine() {
    const r = await fetch("/api/studio/assets");
    if (r.status === 401) return;
    const d = await r.json();
    setMine(d.assets ?? []);
  }
  useEffect(() => {
    fetch("/api/studio/assets?scope=public").then((r) => r.json()).then((d) => setExplore(d.assets ?? [])).catch(() => {});
    loadMine();
  }, []);

  useEffect(() => {
    if (!current || current.status !== "processing") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/studio/assets/${current.id}`);
      const d = await r.json();
      if (d.asset) {
        setCurrent(d.asset);
        if (d.asset.status !== "processing") {
          clearInterval(t);
          loadMine();
        }
      }
    }, 4000);
    return () => clearInterval(t);
  }, [current?.id, current?.status]);

  async function generate(text: string, kind: Kind) {
    setError("");
    if (kind === "audio") {
      if (!text.trim()) return;
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      setCurrent({ id: 0, kind: "audio", prompt: text, status: "completed", resultUrl: null, error: null });
      return;
    }
    setBusy(true);
    try {
      const apiKind = kind === "agent" ? "image" : kind;
      const full = kind === "agent" ? `Art direction, single finished frame: ${text}` : text;
      const r = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: apiKind, prompt: full, ratio: kind === "avatar" ? "9:16" : ratio }),
      });
      const d = await r.json();
      if (r.status === 401) {
        location.href = signIn;
        return;
      }
      if (!r.ok) throw new Error(d.error ?? "생성 실패");
      setCurrent(d.asset);
      if (d.asset.status === "completed") loadMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  const nav: { id: View; label: string }[] = [
    { id: "create", label: "Create" },
    { id: "explore", label: "Explore" },
    { id: "assets", label: "Assets" },
    { id: "elements", label: "Elements" },
    { id: "canvas", label: "Canvas" },
  ];

  return (
    <div style={{ background: "#0e0f12", color: "#f4f4f5", minHeight: "70vh" }}>
      <div style={{ display: "flex", minHeight: "70vh" }}>
        <aside style={{ width: 220, flex: "none", borderRight: "1px solid rgba(255,255,255,.08)", padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Studio</div>
          {nav.map((n) => (
            <button key={n.id} type="button" onClick={() => setView(n.id)} style={item(view === n.id)}>{n.label}</button>
          ))}
          <a href={signIn} style={{ ...item(false), display: "block", marginTop: 24, textAlign: "center", background: "#fff", color: "#111" }}>Sign in · Free credits</a>
        </aside>
        <main style={{ flex: 1, padding: "28px 24px 48px" }}>
          {error ? <p style={{ color: "#ff8d84" }}>{error}</p> : null}
          {view === "create" ? (
            <>
              <h1 style={{ textAlign: "center", fontSize: 32, marginTop: 0, textWrap: "balance" }}>Create anything you imagine</h1>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                <button type="button" style={pill(true)} onClick={() => setView("create")}>Generate</button>
                <button type="button" style={pill(false)} onClick={() => setView("canvas")}>Canvas</button>
              </div>
              <section style={{ maxWidth: 880, margin: "0 auto", background: "#17181d", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 10 }}>
                <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,.08)", paddingBottom: 8 }}>
                  {TABS.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)} style={item(tab === t.id)}>{t.label}</button>
                  ))}
                </div>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={meta.placeholder} rows={3} style={{ width: "100%", marginTop: 10, background: "transparent", border: 0, color: "#fff", resize: "none", outline: "none", fontSize: 15, lineHeight: 1.5 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {["1:1", "9:16", "16:9"].map((r) => (
                    <button key={r} type="button" onClick={() => setRatio(r)} style={item(ratio === r)}>{r}</button>
                  ))}
                  <button type="button" disabled={busy} onClick={() => generate(prompt, tab)} style={{ marginLeft: "auto", background: "#fff", color: "#111", borderRadius: 999, padding: "8px 16px", fontWeight: 700 }}>
                    {busy ? "만드는 중…" : "Generate"}
                  </button>
                </div>
              </section>
              <Result asset={current} />
            </>
          ) : null}

          {view === "explore" ? (
            <>
              <h1 style={{ fontSize: 28 }}>Explore</h1>
              <Grid assets={explore} empty="아직 공개된 생성물이 없습니다. Create에서 만들면 여기에 쌓입니다." />
            </>
          ) : null}

          {view === "assets" ? (
            <>
              <h1 style={{ fontSize: 28 }}>Assets</h1>
              <Grid assets={mine} empty="로그인 후 만든 이미지와 영상이 여기 표시됩니다." />
            </>
          ) : null}

          {view === "elements" ? (
            <>
              <h1 style={{ fontSize: 28 }}>Elements</h1>
              <p style={{ color: "#9a9aa3" }}>누르면 프롬프트에 들어갑니다.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {ELEMENTS.map((name) => (
                  <button key={name} type="button" style={{ ...card, padding: 16, minWidth: 160 }} onClick={() => { setPrompt((p) => `${p} @${name}`.trim()); setView("create"); }}>
                    <b>{name}</b>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {view === "canvas" ? (
            <>
              <h1 style={{ fontSize: 28 }}>Canvas</h1>
              <button type="button" style={pill(true)} onClick={() => setNodes((n) => [...n, "New frame"])}>New node</button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginTop: 16 }}>
                {nodes.map((n, i) => (
                  <label key={i} style={card}>
                    <textarea value={n} rows={3} onChange={(e) => setNodes(nodes.map((x, j) => (j === i ? e.target.value : x)))} style={{ width: "100%", background: "transparent", color: "#fff", border: 0 }} />
                    <button type="button" disabled={busy} onClick={() => generate(n, "image")}>Run image</button>
                  </label>
                ))}
              </div>
              <Result asset={current} />
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Result({ asset }: { asset: Asset | null }) {
  if (!asset) return null;
  return (
    <section style={{ maxWidth: 880, margin: "20px auto" }}>
      <p style={{ color: "#9a9aa3" }}>{asset.status === "processing" ? "영상 생성 중…" : asset.status === "failed" ? asset.error : asset.kind}</p>
      {asset.resultUrl && asset.kind === "video" ? <video src={asset.resultUrl} controls style={{ width: "100%", borderRadius: 12 }} /> : null}
      {asset.resultUrl && asset.kind !== "video" ? <img src={asset.resultUrl} alt="" style={{ width: "100%", borderRadius: 12 }} /> : null}
      {asset.kind === "audio" && asset.status === "completed" ? <p>이 브라우저에서 프롬프트를 읽어 줍니다.</p> : null}
    </section>
  );
}

function Grid({ assets, empty }: { assets: Asset[]; empty: string }) {
  if (!assets.length) return <p style={{ color: "#9a9aa3" }}>{empty}</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
      {assets.map((a) => (
        <article key={a.id} style={card}>
          {a.resultUrl && a.kind === "video" ? <video src={a.resultUrl} controls style={{ width: "100%" }} /> : null}
          {a.resultUrl && a.kind !== "video" ? <img src={a.resultUrl} alt="" style={{ width: "100%", borderRadius: 8 }} /> : null}
          <p style={{ fontSize: 13 }}>{a.prompt.slice(0, 80)}</p>
          <small style={{ color: "#6e6e78" }}>{a.status}</small>
        </article>
      ))}
    </div>
  );
}

const item = (on: boolean): React.CSSProperties => ({
  display: "block", width: "100%", textAlign: "left", background: on ? "#2a2b32" : "transparent",
  color: "#eee", border: 0, borderRadius: 10, padding: "8px 10px", marginBottom: 4, cursor: "pointer",
});
const pill = (on: boolean): React.CSSProperties => ({
  borderRadius: 999, padding: "8px 16px", border: 0, cursor: "pointer",
  background: on ? "#fff" : "#1a1b20", color: on ? "#111" : "#aaa",
});
const card: React.CSSProperties = { background: "#1b1c21", borderRadius: 12, padding: 10, border: "1px solid rgba(255,255,255,.08)" };
