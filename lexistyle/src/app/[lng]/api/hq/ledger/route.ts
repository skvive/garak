import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { ackLedgerAlert, listLedger, scanLedger } from "@/lib/hq/integrity";
import { getState, mutate } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json(listLedger(await getState()));
}

/** POST {action:'scan'} | {action:'ack', id} */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: number };
  if (b.action === "ack") {
    if (!b.id) return bad("id required");
    try {
      return NextResponse.json(await mutate((s) => ackLedgerAlert(s, Number(b.id))));
    } catch (e) {
      return bad(e instanceof Error ? e.message : "failed", 422);
    }
  }
  return NextResponse.json(await scanLedger());
}
