import { claimJob } from "@/lib/shorts/service";
import { fail, json, workerAuthorized } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 렌더 워커 전용: 다음 잡 점유. 없으면 {job:null} */
export async function POST(req: Request) {
  if (!workerAuthorized(req)) return json({ error: "unauthorized" }, 401);
  try {
    return json({ job: await claimJob() });
  } catch (e) {
    return fail(e);
  }
}
