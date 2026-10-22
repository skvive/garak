"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { PipelineProgress } from "@/lib/catalog/pipeline-progress";

const STEPS = [
  { key: "catalog" as const, label: "카탈로그", href: "/hq/pipeline/catalog", count: (p: PipelineProgress) => p.catalog },
  { key: "import" as const, label: "Import", href: "/hq/pipeline/import", count: (p: PipelineProgress) => p.imported },
  { key: "pdp" as const, label: "PDP", href: "/hq/pipeline/pdp", count: (p: PipelineProgress) => p.pdp },
  { key: "export" as const, label: "Export", href: "/hq/pipeline/export", count: (p: PipelineProgress) => p.exportJobs },
];

export function PipelineWorkProgress({
  focus,
  progress,
  busy,
  msg,
  children,
}: {
  focus: "all" | "catalog" | "import" | "pdp" | "export";
  progress: PipelineProgress | null;
  busy: string;
  msg: string;
  children: ReactNode;
}) {
  const crawl = progress?.crawl;
  return (
    <section className="mt-6 rounded-2xl border border-line bg-fog/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-balance text-[15px] font-bold">작업진행</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-dim">
            카탈로그 · Import · PDP · Export 공통. 이 단계에서 이어서 처리할 작업을 여기서 봅니다.
          </p>
        </div>
        {crawl && (
          <p className="text-[11px] leading-relaxed text-dim">
            최근 갱신 {crawl.status}
            {crawl.pagesDone ? ` · ${crawl.pagesDone}p` : ""}
            {crawl.itemsUpserted ? ` · ${crawl.itemsUpserted}건` : ""}
            {crawl.lastError ? ` · ${crawl.lastError}` : ""}
          </p>
        )}
      </div>

      <ol className="mt-3 flex flex-wrap items-center gap-1 text-[12px]">
        {STEPS.map((s, i) => {
          const current = focus === s.key || (focus === "all" && s.key === "catalog");
          const n = progress ? s.count(progress) : "·";
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 && <span className="px-1 text-dim" aria-hidden>→</span>}
              <Link
                href={s.href}
                className={`rounded-full px-2.5 py-1.5 leading-relaxed ${
                  current ? "bg-ink font-bold text-white" : "bg-paper text-ink hover:bg-fog"
                }`}
              >
                {s.label} {n}
              </Link>
            </li>
          );
        })}
      </ol>

      {(busy || msg) && (
        <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[12px] leading-relaxed text-dim">
          {busy ? `처리 중: ${busy}…` : msg}
        </p>
      )}

      {progress && (progress.exportQueued > 0 || progress.exportFailed > 0) && (
        <p className="mt-2 text-[12px] leading-relaxed text-dim">
          Export 대기 {progress.exportQueued} · 실패 {progress.exportFailed}
        </p>
      )}

      <div className="mt-4">{children}</div>
    </section>
  );
}
