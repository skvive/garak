import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { syncCjSourcingOrders } from "@/lib/hq/cj-order-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — CJ listOrder를 HQ 소싱발주에 반영 (쓰기 전 읽기 동기화) */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  try {
    return NextResponse.json(await syncCjSourcingOrders());
  } catch (e) {
    return bad(e instanceof Error ? e.message : "sync failed", 500);
  }
}
