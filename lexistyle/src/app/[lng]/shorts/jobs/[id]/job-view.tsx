"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Job = {
  id: number;
  status: "queued" | "rendering" | "uploading" | "completed" | "failed";
  progress: number;
  strategy: string;
  watermark: boolean;
  finalVideoUrl: string | null;
  error: string | null;
  refunded: boolean;
  createdAt: string;
  script: { label: string; hookText: string };
};

const STEP: Record<Job["status"], string> = {
  queued: "렌더 순서를 기다리는 중",
  rendering: "영상을 합성하는 중",
  uploading: "영상을 저장하는 중",
  completed: "완성",
  failed: "실패",
};

export function JobView({ id }: { id: string }) {
  const params = useParams();
  const lng = typeof params.lng === "string" ? params.lng : "ko";
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [gate, setGate] = useState(false);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const res = await fetch(`/api/shorts/jobs/${id}`, { cache: "no-store" });
        const d = (await res.json()) as { job?: Job; error?: string };
        if (!res.ok || !d.job) throw new Error(d.error ?? "불러오지 못했습니다.");
        if (stop) return;
        setJob(d.job);
        setError("");
        if (d.job.status !== "completed" && d.job.status !== "failed") timer = setTimeout(tick, 2000);
      } catch (e) {
        if (!stop) {
          setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
          timer = setTimeout(tick, 5000);
        }
      }
    }
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  const waitingLong = job?.status === "queued" && Date.now() - new Date(job.createdAt).getTime() > 3 * 60_000;

  return (
    <div className="mx-auto max-w-md px-4 py-10 leading-relaxed" style={{ wordBreak: "keep-all" }}>
      <Link href={`/${lng}/shorts`} className="mb-6 inline-block text-sm text-dim underline">
        새 영상 만들기
      </Link>
      {error ? <p className="mb-4 rounded-xl bg-fog px-4 py-3 text-sm text-sale">{error}</p> : null}
      {!job ? (
        <p className="text-sm text-dim">불러오는 중…</p>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold" style={{ textWrap: "balance" }}>{job.script.hookText}</h1>
          <p className="mb-6 text-sm text-dim">{job.script.label} · 9:16 · 15초</p>

          {job.status === "completed" && job.finalVideoUrl ? (
            <>
              <video src={job.finalVideoUrl} controls playsInline className="mb-4 aspect-[9/16] w-full rounded-3xl bg-ink" />
              {job.watermark ? (
                <button type="button" onClick={() => setGate(true)} className="block w-full rounded-xl bg-ink py-4 text-center text-sm font-semibold text-white">
                  MP4 내려받기
                </button>
              ) : (
                <a href={job.finalVideoUrl} download className="block rounded-xl bg-ink py-4 text-center text-sm font-semibold text-white">
                  MP4 내려받기
                </a>
              )}
              {released ? (
                <a href={job.finalVideoUrl} download className="mt-3 block text-center text-sm text-dim underline">워터마크 포함 파일 받기</a>
              ) : null}
              {gate ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" role="dialog" aria-modal="true">
                  <div className="w-full max-w-md rounded-3xl bg-paper p-6">
                    <h2 className="mb-2 text-xl font-bold" style={{ textWrap: "balance" }}>받는 순간이 플랜을 고르는 자리입니다</h2>
                    <p className="mb-5 text-sm text-dim">이 영상은 미리 볼 수 있습니다. 워터마크 없는 원본은 Pro부터이고, 무료와 Starter는 워터마크가 들어간 파일을 받습니다.</p>
                    <Link href={`/${lng}/shorts#plans`} className="mb-2 block rounded-xl bg-coral py-3 text-center text-sm font-semibold text-white">Pro로 원본 받기</Link>
                    <button
                      type="button"
                      className="block w-full rounded-xl border border-ink py-3 text-sm font-semibold"
                      onClick={() => {
                        setGate(false);
                        setReleased(true);
                      }}
                    >
                      워터마크 포함으로 받기
                    </button>
                    <button type="button" className="mt-3 w-full text-sm text-dim" onClick={() => setGate(false)}>닫기</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : job.status === "failed" ? (
            <div className="rounded-2xl bg-fog p-5 text-sm">
              <p className="mb-1 font-semibold text-sale">영상을 만들지 못했습니다.</p>
              <p className="text-dim">{job.refunded ? "사용한 크레딧 1개는 돌려드렸어요. " : ""}다른 대본이나 이미지로 다시 시도해 주세요.</p>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>{STEP[job.status]}</span>
                <span className="font-semibold">{job.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-fog">
                <div className="h-full bg-coral transition-all" style={{ width: `${job.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-dim">
                {job.strategy === "wan_i2v" ? "AI 모션 클립을 먼저 만든 뒤 자막을 합성합니다. 보통 2~5분 걸려요." : "보통 1~2분 걸려요."}
                {waitingLong ? " 대기 중인 영상이 많아 조금 더 걸리고 있어요." : ""} 이 화면을 닫아도 영상은 계속 만들어집니다.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
