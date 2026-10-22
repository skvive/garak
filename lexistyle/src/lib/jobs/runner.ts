/** 잡 실행기 — 작업별 콜백을 pLimit(5)로 병렬 실행하고 진행률을 스토어에 기록 */
import { pLimit } from "./p-limit";
import { createJob, getJob, markJobStatus, updateTask } from "./store";
import type { JobKind, JobProgress } from "./types";

export const DEFAULT_CONCURRENCY = 5;

export type JobTaskContext = {
  jobId: string;
  refId: number;
  onProgress: (percent: number) => void;
};

export type JobRunOptions = {
  kind: JobKind;
  targets: { refId: number; label: string }[];
  run: (ctx: JobTaskContext) => Promise<{ previewUrl?: string } | void>;
  concurrency?: number;
};

export function runJob(opts: JobRunOptions): JobProgress {
  const job = createJob(opts.kind, opts.targets);
  const limit = pLimit(opts.concurrency ?? DEFAULT_CONCURRENCY);
  markJobStatus(job.jobId, "running");

  void Promise.all(
    job.tasks.map((task) => {
      const refId = task.refId;
      return limit(async () => {
        updateTask(job.jobId, refId, { status: "running", percent: 0 });
        try {
          const result = await opts.run({
            jobId: job.jobId,
            refId,
            onProgress: (percent) => {
              updateTask(job.jobId, refId, { percent });
            },
          });
          updateTask(job.jobId, refId, {
            status: "done",
            percent: 100,
            previewUrl: result?.previewUrl,
          });
        } catch (e) {
          updateTask(job.jobId, refId, {
            status: "failed",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      });
    }),
  ).finally(() => {
    const current = getJob(job.jobId);
    if (current) {
      const failed = current.tasks.filter((t) => t.status === "failed").length;
      markJobStatus(job.jobId, failed > 0 && current.done === 0 ? "failed" : "done");
    }
  });

  return job;
}
