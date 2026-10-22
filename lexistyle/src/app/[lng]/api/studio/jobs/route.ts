import { NextResponse } from "next/server";
import { createJob, listJobs } from "@/lib/studio/store";
import { processGenerationJob } from "@/lib/studio/generate";
import { bad, studioActor, unauthorized } from "@/lib/studio/http";
import { JOB_KINDS } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await studioActor())) return unauthorized();
  return NextResponse.json({ items: await listJobs() });
}

export async function POST(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!JOB_KINDS.includes(body.kind)) throw new Error("invalid job kind");
    const job = await createJob({
      kind: body.kind,
      cafe24ProductNo: body.cafe24ProductNo ? Number(body.cafe24ProductNo) : undefined,
      documentId: body.documentId ? Number(body.documentId) : undefined,
      payload: body.input ?? {},
      actor,
    });
    if (body.run === false) return NextResponse.json({ job });
    const result = await processGenerationJob(job.id, actor);
    return NextResponse.json(result);
  } catch (error) {
    return bad(error, 422);
  }
}

export async function PATCH(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!body.id) throw new Error("id required");
    return NextResponse.json(await processGenerationJob(Number(body.id), actor));
  } catch (error) {
    return bad(error, 422);
  }
}
