"use client";

import { useEffect, useState } from "react";
import type { JobProgress } from "@/lib/jobs/types";
import { openCjProductPopup } from "@/lib/catalog/cj-product-link";

/** 진행률 팝업 — import/pdp/export 공용. 1.5초 폴링. PDP 탭 미리보기용 renderTab 지원. */
export function JobProgressPopup({
  jobId,
  onClose,
  renderTab,
  resolveCjUrl,
}: {
  jobId: string;
  onClose: () => void;
  renderTab?: (taskRefId: number) => React.ReactNode;
  /** catalogId(refId) → CJ 원본 URL — 있으면 작업 제목 클릭으로 팝업 */
  resolveCjUrl?: (refId: number) => string | null;
}) {
  const [job, setJob] = useState<JobProgress | null>(null);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/hq/jobs/${jobId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setJob(json.job as JobProgress);
      } catch (e) {
        if (!stopped) setErr(e instanceof Error ? e.message : "진행률 조회 실패");
      }
    }
    void poll();
    const timer = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [jobId]);

  if (err || !job) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <button aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-2xl bg-paper p-5">
          <p className="text-[13px] text-coral">{err || "진행률 로딩 중…"}</p>
          <button onClick={onClose} className="mt-3 rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">닫기</button>
        </div>
      </div>
    );
  }

  const active = job.tasks.find((t) => t.refId === activeTab) ?? job.tasks[0];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold">진행 현황 · {job.kind}</h3>
            <p className="mt-1 text-[12px] text-dim">
              완료 {job.done}/{job.total} · 실패 {job.failed} · 전체 {job.percent}%
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">닫기</button>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-fog">
          <div className="h-full bg-ink transition-all" style={{ width: `${job.percent}%` }} />
        </div>

        {job.tasks.length > 1 && (
          <div className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-fog p-1">
            {job.tasks.map((t) => (
              <button
                key={t.refId}
                onClick={() => setActiveTab(t.refId)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  active?.refId === t.refId ? "bg-ink text-white" : "text-dim"
                }`}
              >
                {t.label.slice(0, 16)}
                {t.status === "done" ? " ✓" : t.status === "failed" ? " ✗" : ` ${t.percent}%`}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {job.tasks.map((t) => {
            const cjUrl = resolveCjUrl?.(t.refId) ?? null;
            return (
              <li key={t.refId} className="rounded-lg border border-line p-2.5 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  {cjUrl ? (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left font-medium underline-offset-2 hover:text-coral hover:underline"
                      title="CJ 원본 상품 페이지 열기"
                      onClick={() =>
                        openCjProductPopup({
                          sourceUrl: cjUrl,
                          externalId: String(t.refId),
                          supplierCode: "cjdropshipping",
                        })
                      }
                    >
                      {t.label}
                    </button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
                  )}
                  <span className="shrink-0 text-[11px] text-dim">
                    {t.status === "done" ? "완료" : t.status === "failed" ? "실패" : `${t.percent}%`}
                  </span>
                </div>
                {t.error && <p className="mt-1 text-[11px] text-coral">{t.error}</p>}
              </li>
            );
          })}
        </ul>

        {active && renderTab && renderTab(active.refId)}
      </div>
    </div>
  );
}