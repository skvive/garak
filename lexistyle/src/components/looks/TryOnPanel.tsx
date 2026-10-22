"use client";
import { useEffect, useRef, useState } from "react";
import { FIT_DISCLAIMER, type SavedLook, type VtoJob } from "@/lib/looks/types";
import type { Portrait } from "./PortraitPicker";
const KEY = "lexi-look-job-v1";
type SavedJob = { key: string; job: VtoJob; started: number };

export function TryOnPanel({ look, portrait, consent, adult, available, onBusy }: { look: SavedLook; portrait: Portrait | null; consent: boolean; adult: boolean; available: boolean; onBusy?: (busy: boolean) => void }) {
  const [job, setJob] = useState<VtoJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState<SavedJob | null>(null);
  const abort = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const currentKey = JSON.stringify([portrait?.id, look.slots, look.occasion]);
  const busyCallback = useRef(onBusy); busyCallback.current = onBusy;
  useEffect(() => {
    abort.current?.abort(); locked.current = false; setBusy(false); busyCallback.current?.(false); setJob(null); setError(""); setPending(null);
    try { const saved = JSON.parse(sessionStorage.getItem(KEY) || "null") as SavedJob | null;
      if (saved?.key === currentKey) { setJob(saved.job); if (!["completed", "failed"].includes(saved.job.status)) setPending(saved); }
    } catch { /* no stored job */ }
    return () => { abort.current?.abort(); };
  }, [currentKey]);

  function remember(value: SavedJob) { try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* result still available in this page */ } }
  async function poll(saved: SavedJob, signal: AbortSignal) {
    let current = saved.job;
    const deadline = Date.now() + 5 * 60_000;
    while (Date.now() < deadline) {
      await new Promise<void>((resolve, reject) => { const stop = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }; const timer = setTimeout(() => { signal.removeEventListener("abort", stop); resolve(); }, 3000); signal.addEventListener("abort", stop, { once: true }); if (signal.aborted) stop(); });
      const response = await fetch(`/api/vto/jobs/${current.id}`, { signal, headers: { Authorization: `Bearer ${saved.job.token}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403) { setPending(null); const expired = { ...saved.job, status: "failed" as const, error: data.error }; setJob(expired); remember({ ...saved, job: expired }); }
        throw new Error(data.error || "생성 상태를 확인하지 못했습니다.");
      }
      current = { ...data, token: saved.job.token } as VtoJob;
      setJob(current); remember({ ...saved, job: current });
      if (current.status === "completed" || current.status === "failed") { setPending(null); return; }
    }
    throw new Error("생성이 길어지고 있습니다. 잠시 후 ‘결과 다시 확인’을 눌러 주세요.");
  }
  async function run(resume?: SavedJob) {
    if (locked.current) return;
    if (!resume && (!portrait || !consent || !adult || !Object.keys(look.slots).length)) return;
    locked.current = true; setBusy(true); busyCallback.current?.(true); setError("");
    const controller = new AbortController(); abort.current = controller;
    const started = resume?.started || Date.now();
    const clock = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    setElapsed(Math.floor((Date.now() - started) / 1000));
    try {
      let saved = resume;
      if (!saved) {
        setJob(null); setPending(null);
        const photo = await (await fetch(portrait!.data)).blob();
        const form = new FormData(); form.set("photo", photo, "portrait.jpg"); form.set("slots", JSON.stringify(look.slots)); form.set("occasion", look.occasion); form.set("consent", "true"); form.set("adult", "true");
        const response = await fetch("/api/vto", { method: "POST", body: form, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "생성 요청을 보내지 못했습니다.");
        saved = { key: currentKey, job: data, started }; setJob(data); setPending(saved); remember(saved);
      }
      await poll(saved, controller.signal);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "연결이 끊어졌습니다. 다시 확인해 주세요."); }
    finally { clearInterval(clock); if (abort.current === controller) { locked.current = false; setBusy(false); busyCallback.current?.(false); } }
  }
  const count = Object.keys(look.slots).length;
  return <div className="space-y-4">
    {!available && <p role="status" className="rounded-xl bg-fog p-4 text-sm leading-relaxed">이미지 서비스 연결을 확인 중입니다. 사진과 상품을 먼저 준비해 주세요.</p>}
    <button type="button" disabled={busy || !available || !portrait || !consent || !adult || !count || !!pending} onClick={() => void run()} className="w-full rounded-xl bg-ink px-4 py-4 text-sm font-bold text-white disabled:opacity-40">{busy ? "착장 이미지 생성 중…" : `선택한 ${count}개 상품 입혀보기`}</button>
    {!busy && pending && <button type="button" onClick={() => void run(pending)} className="w-full rounded-xl border border-ink py-3 text-sm font-semibold">결과 다시 확인</button>}
    {busy && <div role="status" aria-live="polite" className="rounded-xl bg-fog p-4 text-sm leading-relaxed"><p className="font-semibold">{job ? "2/3 · 얼굴과 상품을 한 장의 착장으로 만드는 중" : "1/3 · 사진과 상품을 준비하는 중"}</p><p className="mt-2 tabular-nums text-dim">{elapsed}초 경과 · 보통 1–3분 정도 걸립니다.</p><button type="button" className="mt-2 underline" onClick={() => abort.current?.abort()}>대기 멈추기</button><p className="mt-1 text-xs text-dim">대기를 멈춰도 이미 접수한 AI 작업은 계속될 수 있습니다.</p></div>}
    {(error || job?.error) && <p role="alert" className="rounded-xl border border-line p-4 text-sm leading-relaxed text-coral">{error || job?.error}</p>}
    {job?.status === "completed" && job.outputUrl && <figure><p className="mb-3 text-sm font-semibold">3/3 · 나의 착장 완성</p><img src={job.outputUrl} alt="내 사진과 선택한 상품으로 생성한 착장" className="max-h-[760px] w-full rounded-xl bg-fog object-contain" /><figcaption className="mt-2 text-xs leading-relaxed text-dim">{FIT_DISCLAIMER}</figcaption><a href={job.outputUrl} download="LEXI-my-look.jpg" className="mt-4 block rounded-xl border border-ink py-3 text-center text-sm font-semibold">착장 이미지 다운로드</a></figure>}
    <p className="text-xs leading-relaxed text-dim">접속 네트워크당 하루 생성 요청 3회. 얼굴 사진만 사용하면 체형은 AI가 구성합니다. {FIT_DISCLAIMER}</p>
  </div>;
}
