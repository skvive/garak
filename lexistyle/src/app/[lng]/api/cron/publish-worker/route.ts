import { NextResponse } from "next/server";
import { processExportQueue } from "@/lib/export/jobs";
import { pollTracking, processPublishQueue } from "@/lib/hq/services";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 일 1회 스윕: 게시 재시도 + export_jobs + 트래킹 폴링 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const publish = await processPublishQueue(50);
  const exports = await processExportQueue(20);
  const tracking = await pollTracking();
  return NextResponse.json({ publish, exports, tracking });
}
