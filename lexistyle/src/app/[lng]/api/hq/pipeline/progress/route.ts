import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { getPipelineProgress } from "@/lib/catalog/pipeline-progress";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json(await getPipelineProgress());
}
