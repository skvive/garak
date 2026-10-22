import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { importPurchaseCsv } from "@/lib/hq/services";

export const dynamic = "force-dynamic";

/** POST {channelCode, filename, csv} — 엑셀(CSV 변환본) 인입. 스펙 §2 P5-1 */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  if (!b.channelCode || !b.csv) return bad("channelCode, csv required");
  try {
    return NextResponse.json(await importPurchaseCsv(b.channelCode, b.filename ?? "upload.csv", b.csv, actor));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "import failed", 422);
  }
}
