import { reportJob } from "@/lib/shorts/service";
import { fail, json, workerAuthorized } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";

type Body = { jobId?: number; status?: "rendering" | "uploading" | "completed" | "failed"; progress?: number; url?: string; error?: string };

/** 렌더 워커 전용: 진행률·완료(URL)·실패(크레딧 환불) 보고 */
export async function POST(req: Request) {
  if (!workerAuthorized(req)) return json({ error: "unauthorized" }, 401);
  try {
    const b = (await req.json().catch(() => ({}))) as Body;
    if (!b.jobId || !b.status || !["rendering", "uploading", "completed", "failed"].includes(b.status)) {
      return json({ error: "jobId, status 필요" }, 400);
    }
    return json({ job: await reportJob(Number(b.jobId), { status: b.status, progress: b.progress, url: b.url, error: b.error }) });
  } catch (e) {
    return fail(e);
  }
}
