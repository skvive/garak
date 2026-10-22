import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { listJobs } from "@/lib/jobs/store";
import type { JobKind } from "@/lib/jobs/types";
import { startExportJob, startImportJob, startPdpJob } from "@/lib/jobs/executors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/hq/jobs — 최근 잡 목록 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json({ jobs: listJobs(20) });
}

/**
 * POST /api/hq/jobs — 잡 시작
 * body: { kind: "import"|"pdp"|"export", targetIds: number[], labels?: Record<number,string> }
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as {
      kind?: JobKind;
      targetIds?: number[];
      labels?: Record<number, string>;
    };
    if (!body.kind || !body.targetIds?.length) return bad("kind and targetIds required");

    const targets = body.targetIds.map((id) => ({
      refId: id,
      label: body.labels?.[id] ?? `#${id}`,
    }));

    let job;
    switch (body.kind) {
      case "import":
        job = startImportJob(targets);
        break;
      case "pdp":
        job = startPdpJob(targets);
        break;
      case "export":
        job = startExportJob(targets);
        break;
      default:
        return bad("unknown kind");
    }
    return NextResponse.json({ job });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "job start failed", 500);
  }
}