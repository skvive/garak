import { NextResponse } from "next/server";
import { scanLedger } from "@/lib/hq/integrity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 주기 무결성 스캔 — CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await scanLedger();
  let returnDisputes: unknown;
  if (process.env.AUTO_RETURN_DISPUTE !== "0") {
    const { pullChannelReturns } = await import("@/lib/hq/services");
    returnDisputes = await pullChannelReturns("coupang").catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  }
  return NextResponse.json({ ok: r.ok, openAlerts: r.openAlerts, census: r.census, returnDisputes });
}
