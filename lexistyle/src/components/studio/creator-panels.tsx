"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Media = {
  id: number;
  kind: string;
  name: string;
  url: string;
  alt: string | null;
  source: string;
};

type Job = {
  id: number;
  kind: string;
  status: string;
  cafe24ProductNo: number | null;
  error: string | null;
  createdAt: string;
};

type Document = {
  id: number;
  kind: string;
  title: string;
  status: string;
  currentVersion: number;
  cafe24ProductNo: number | null;
  renderedHtml: string | null;
};

type Product = {
  productNo: number;
  name: string;
  brand: string;
  image: string;
  price: number;
};

type PublishEvent = {
  id: number;
  documentId: number;
  version: number;
  target: string;
  status: string;
  remoteRef: string | null;
  error: string | null;
  metrics: Record<string, number> | null;
  createdAt: string;
};

type Decision = {
  id: number;
  code: string;
  priority: string;
  question: string;
  defaultDecision: string;
  finalDecision: string | null;
  status: string;
};

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "request failed");
  return data;
}

export function MediaLibraryPanel() {
  const [items, setItems] = useState<Media[]>([]);
  const [form, setForm] = useState({ kind: "image", name: "", url: "", alt: "", tags: "" });
  const [message, setMessage] = useState("");
  async function load() {
    setItems((await jsonFetch("/api/studio/media")).items ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await jsonFetch("/api/studio/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags: form.tags.split(",").map((x) => x.trim()).filter(Boolean) }),
      });
      setForm({ ...form, name: "", url: "", alt: "", tags: "" });
      setMessage("미디어를 등록했습니다.");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
        <h2 className="text-[15px] font-bold md:col-span-2">외부 URL 미디어 등록</h2>
        <select className="control" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {["image", "video", "html", "document"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <input className="control" placeholder="파일명" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="control md:col-span-2" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
        <input className="control" placeholder="alt text" value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} />
        <input className="control" placeholder="tags, comma" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <button className="rounded-xl bg-ink py-3 text-[13px] font-bold text-white md:col-span-2">등록</button>
        {message && <p className="text-[12px] text-dim md:col-span-2">{message}</p>}
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-line bg-paper">
            {item.kind === "image" ? (
              <div className="relative aspect-video bg-fog">
                <Image src={item.url} alt={item.alt || item.name} fill sizes="320px" className="object-cover" />
              </div>
            ) : (
              <div className="grid aspect-video place-items-center bg-ink text-[12px] font-bold text-white">{item.kind}</div>
            )}
            <div className="p-4">
              <p className="truncate text-[13px] font-bold">{item.name}</p>
              <p className="mt-1 text-[10px] text-dim">{item.source}</p>
            </div>
          </article>
        ))}
      </div>
      {!items.length && <Empty text="등록된 미디어가 없습니다." />}
    </div>
  );
}

export function GenerationJobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ kind: "pdp", productNo: "", title: "", brief: "" });
  const [message, setMessage] = useState("");
  async function load() {
    const [j, p] = await Promise.all([
      jsonFetch("/api/studio/jobs"),
      jsonFetch("/api/studio/products").catch(() => ({ items: [] })),
    ]);
    setJobs(j.items ?? []);
    setProducts(p.items ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await jsonFetch("/api/studio/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          cafe24ProductNo: form.productNo ? Number(form.productNo) : undefined,
          input: { title: form.title, brief: form.brief },
        }),
      });
      setMessage(`작업 #${result.job?.id ?? "?"} 완료${result.documentId ? ` · 문서 #${result.documentId}` : ""}`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-line bg-paper p-5">
        <p className="text-[15px] font-bold">콘텐츠 생성</p>
        <label className="label">유형
          <select className="control" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {["pdp", "image", "cardnews", "storyboard", "video", "copy"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="label">Cafe24 상품
          <select className="control" value={form.productNo} onChange={(e) => setForm({ ...form, productNo: e.target.value })}>
            <option value="">연결 안 함</option>
            {products.map((p) => <option key={p.productNo} value={p.productNo}>#{p.productNo} {p.name}</option>)}
          </select>
        </label>
        <label className="label">제목<input className="control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="label">브리프<textarea className="control min-h-24" value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} /></label>
        <button className="mt-4 w-full rounded-xl bg-coral py-3 text-[13px] font-bold text-white">생성 실행</button>
        {message && <p className="mt-3 text-[12px] text-dim">{message}</p>}
      </form>
      <div className="space-y-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-2xl border border-line bg-paper p-4">
            <div className="flex items-center gap-3">
              <span className={`size-2 rounded-full ${job.status === "completed" ? "bg-sage" : job.status === "failed" ? "bg-coral" : "bg-gold"}`} />
              <div className="flex-1">
                <p className="text-[13px] font-bold">#{job.id} {job.kind}</p>
                <p className="text-[11px] text-dim">product #{job.cafe24ProductNo || "—"} · {job.status}</p>
              </div>
              {job.status === "failed" && <button onClick={() => jsonFetch("/api/studio/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id }) }).then(load)} className="text-[11px] font-bold text-coral">Retry</button>}
            </div>
            {job.error && <p className="mt-2 text-[11px] text-coral">{job.error}</p>}
          </article>
        ))}
        {!jobs.length && <Empty text="생성 작업이 없습니다." />}
      </div>
    </div>
  );
}

export function DocumentsPanel({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const [items, setItems] = useState<Document[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const query = reviewOnly ? "?status=review" : "?kind=pdp";
    setItems((await jsonFetch(`/api/studio/documents${query}`)).items ?? []);
  }
  useEffect(() => {
    void load();
  }, [reviewOnly]);
  async function transition(id: number, status: string) {
    try {
      await jsonFetch("/api/studio/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setMessage(`문서 #${id} → ${status}`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <div className="space-y-3">
      {message && <p className="rounded-xl bg-fog p-3 text-[12px] text-dim">{message}</p>}
      {items.map((doc) => (
        <article key={doc.id} className="rounded-2xl border border-line bg-paper p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{doc.title}</p>
              <p className="text-[11px] text-dim">#{doc.id} · product #{doc.cafe24ProductNo || "—"} · v{doc.currentVersion} · {doc.status}</p>
            </div>
            {doc.status === "draft" && <button onClick={() => transition(doc.id, "review")} className="button-secondary">검수 요청</button>}
            {doc.status === "review" && (
              <>
                <button onClick={() => transition(doc.id, "rejected")} className="button-secondary">반려</button>
                <button onClick={() => transition(doc.id, "approved")} className="button-primary">승인</button>
              </>
            )}
            {doc.status === "approved" && <span className="rounded-full bg-sage/10 px-3 py-1.5 text-[11px] font-bold text-sage">게시 준비됨</span>}
          </div>
          {doc.renderedHtml && <iframe title={`${doc.title} preview`} srcDoc={doc.renderedHtml} sandbox="" className="mt-4 h-56 w-full rounded-xl border border-line bg-white" />}
        </article>
      ))}
      {!items.length && <Empty text={reviewOnly ? "승인 대기 문서가 없습니다." : "PDP 문서가 없습니다. 생성 작업에서 PDP를 만드세요."} />}
    </div>
  );
}

export function PublishPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [events, setEvents] = useState<PublishEvent[]>([]);
  const [message, setMessage] = useState("");
  const [metrics, setMetrics] = useState<Record<number, { impressions: string; clicks: string; conversions: string; revenue: string }>>({});
  async function load() {
    const [d, e] = await Promise.all([jsonFetch("/api/studio/documents"), jsonFetch("/api/studio/publish")]);
    setDocuments((d.items ?? []).filter((x: Document) => ["approved", "published"].includes(x.status)));
    setEvents(e.items ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function publish(documentId: number, version?: number) {
    try {
      const data = await jsonFetch("/api/studio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, version }),
      });
      setMessage(`Cafe24 product #${data.productNo} · ${data.status}`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
      await load();
    }
  }
  async function saveMetrics(id: number) {
    const value = metrics[id];
    if (!value) return;
    try {
      await jsonFetch("/api/studio/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, metrics: value }),
      });
      setMessage(`게시 #${id} 성과를 기록했습니다.`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <div className="space-y-5">
      {message && <p className="rounded-xl bg-fog p-3 text-[12px] text-dim">{message}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {documents.map((doc) => (
          <article key={doc.id} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-[14px] font-bold">{doc.title}</p>
            <p className="mt-1 text-[11px] text-dim">product #{doc.cafe24ProductNo || "—"} · v{doc.currentVersion} · {doc.status}</p>
            <button onClick={() => publish(doc.id)} disabled={doc.status !== "approved"} className="button-primary mt-4 disabled:opacity-40">Cafe24 게시</button>
          </article>
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-[15px] font-bold">게시 이력</h2>
        <div className="space-y-2">
          {events.map((event) => (
            <article key={event.id} className="rounded-xl border border-line bg-paper p-4 text-[12px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">#{event.id}</span>
                <span>문서 {event.documentId} · v{event.version}</span>
                <span className={event.status === "failed" ? "text-coral" : "text-sage"}>{event.status}</span>
                <span className="flex-1 truncate text-dim">{event.error || event.remoteRef || event.target}</span>
                {event.status === "published" && event.version > 1 && <button onClick={() => publish(event.documentId, event.version - 1)} className="font-bold">v{event.version - 1} 롤백</button>}
              </div>
              {event.status === "published" && (
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                  {(["impressions", "clicks", "conversions", "revenue"] as const).map((key) => (
                    <input
                      key={key}
                      type="number"
                      min="0"
                      className="control"
                      placeholder={`${key}${event.metrics?.[key] !== undefined ? ` (${event.metrics[key]})` : ""}`}
                      value={metrics[event.id]?.[key] || ""}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        [event.id]: {
                          impressions: metrics[event.id]?.impressions || "",
                          clicks: metrics[event.id]?.clicks || "",
                          conversions: metrics[event.id]?.conversions || "",
                          revenue: metrics[event.id]?.revenue || "",
                          [key]: e.target.value,
                        },
                      })}
                    />
                  ))}
                  <button onClick={() => saveMetrics(event.id)} className="button-secondary">성과 저장</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DecisionsPanel() {
  const [items, setItems] = useState<Decision[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  async function load() {
    setItems((await jsonFetch("/api/studio/decisions")).items ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function resolve(id: number) {
    if (!answers[id]) return;
    await jsonFetch("/api/studio/decisions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, finalDecision: answers[id] }),
    });
    await load();
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="text-coral">{item.code}</span><span className="text-dim">{item.priority}</span><span className="ml-auto">{item.status}</span>
          </div>
          <p className="mt-3 text-[14px] font-bold">{item.question}</p>
          <p className="mt-2 text-[12px] text-dim">현재 기본값: {item.defaultDecision}</p>
          {item.status === "open" ? (
            <div className="mt-4 flex gap-2">
              <input className="control flex-1" placeholder="최종 결정" value={answers[item.id] || ""} onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })} />
              <button onClick={() => resolve(item.id)} className="button-primary">확정</button>
            </div>
          ) : <p className="mt-3 rounded-xl bg-sage/10 p-3 text-[12px] text-sage">{item.finalDecision}</p>}
        </article>
      ))}
      {!items.length && <Empty text="DB 대기열이 비어 있습니다. 문서 대기열은 docs/lexi-studio-decision-queue.md에 있습니다." />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center text-[13px] text-dim">{text}</div>;
}
