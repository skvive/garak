/** 메모리 잡 저장소 — 재시작 시 소실 허용 (v1). DB 영속화는 v2. */
import type { JobKind, JobProgress } from "./types";
import { newJobProgress, recomputeJob } from "./types";

const g = globalThis as unknown as {
  __lexiJobStore?: Map<string, JobProgress>;
  __lexiJobSeq?: number;
};

function store(): Map<string, JobProgress> {
  if (!g.__lexiJobStore) g.__lexiJobStore = new Map();
  return g.__lexiJobStore;
}

export function nextJobId(kind: JobKind): string {
  const n = g.__lexiJobSeq ?? (g.__lexiJobSeq = 1);
  g.__lexiJobSeq = n + 1;
  return `${kind}-${Date.now()}-${n}`;
}

export function createJob(kind: JobKind, targets: { refId: number; label: string }[]): JobProgress {
  const job = newJobProgress({ jobId: nextJobId(kind), kind, targets });
  store().set(job.jobId, job);
  return job;
}

export function getJob(jobId: string): JobProgress | null {
  return store().get(jobId) ?? null;
}

export function listJobs(limit = 20): JobProgress[] {
  return [...store().values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

export function updateTask(
  jobId: string,
  refId: number,
  patch: Partial<Pick<JobProgress["tasks"][number], "status" | "percent" | "previewUrl" | "error">> & {
    label?: string;
  },
): JobProgress | null {
  const job = store().get(jobId);
  if (!job) return null;
  const task = job.tasks.find((t) => t.refId === refId);
  if (!task) return null;
  if (patch.label) task.label = patch.label;
  if (patch.status) task.status = patch.status;
  if (typeof patch.percent === "number") task.percent = patch.percent;
  if (patch.previewUrl !== undefined) task.previewUrl = patch.previewUrl;
  if (patch.error !== undefined) task.error = patch.error;
  recomputeJob(job);
  return job;
}

export function markJobStatus(jobId: string, status: JobProgress["status"]): JobProgress | null {
  const job = store().get(jobId);
  if (!job) return null;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  return job;
}