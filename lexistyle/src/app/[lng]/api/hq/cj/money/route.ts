import { NextResponse } from "next/server";
import { hqActor, unauthorized, bad } from "@/lib/hq/auth";
import { loadCjMoney } from "@/lib/hq/cj-order-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET — CJ 월렛/미결제/차액 (LEXI 마진과 별 장부) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    return NextResponse.json(await loadCjMoney());
  } catch (e) {
    return bad(e instanceof Error ? e.message : "wallet failed", 500);
  }
}
