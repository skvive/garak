/** 공통 잡 진행률 모델 — Import/PDP/Export 모든 잡에 공용 */
export type JobKind = "import" | "pdp" | "export";

export type TaskStatus = "queued" | "running" | "done" | "failed";

export type TaskProgress = {
  refId: number;
  label: string;
  status: TaskStatus;
  percent: number;
  previewUrl?: string;
  error?: string;
};

export type JobStatus = "queued" | "running" | "done" | "failed";

export type JobProgress = {
  jobId: string;
  kind: JobKind;
  total: number;
  done: number;
  failed: number;
  percent: number;
  tasks: TaskProgress[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export function newJobProgress(input: {
  jobId: string;
  kind: JobKind;
  targets: { refId: number; label: string }[];
}): JobProgress {
  const now = new Date().toISOString();
  return {
    jobId: input.jobId,
    kind: input.kind,
    total: input.targets.length,
    done: 0,
    failed: 0,
    percent: 0,
    tasks: input.targets.map((t) => ({
      refId: t.refId,
      label: t.label,
      status: "queued",
      percent: 0,
    })),
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

export function recomputeJob(job: JobProgress): JobProgress {
  const done = job.tasks.filter((t) => t.status === "done").length;
  const failed = job.tasks.filter((t) => t.status === "failed").length;
  const running = job.tasks.filter((t) => t.status === "running").length;
  job.done = done;
  job.failed = failed;
  job.percent =
    job.total === 0
      ? 100
      : Math.round(((done + failed) / job.total) * 100);
  job.status =
    failed + done >= job.total && job.total > 0
      ? failed > 0 && done === 0
        ? "failed"
        : "done"
      : running > 0
        ? "running"
        : job.total === 0
          ? "done"
          : "queued";
  job.updatedAt = new Date().toISOString();
  return job;
}