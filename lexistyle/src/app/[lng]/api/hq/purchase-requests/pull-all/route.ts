import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { syncCjSourcingOrders } from "@/lib/hq/cj-order-sync";
import { pullChannelOrders } from "@/lib/hq/services";
import { getState } from "@/lib/hq/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST — 모든 채널 주문 일괄 pull (쿠팡/Shopify/Amazon AU 등) → CJ 자동발주 → CJ 상태 동기화 */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { channels?: string[] };
  const s = await getState();
  const paused = s.salesChannelMeta ?? {};
  const targetCodes = (body.channels ?? s.channels.map((c) => c.code)).filter((code) => !paused[code]?.paused);
  const results: { channel: string; ok: boolean; count: number; pulled?: number; created?: number; error?: string }[] = [];
  for (const code of targetCodes) {
    try {
      const r = await pullChannelOrders(code);
      results.push({
        channel: code,
        ok: true,
        pulled: r.pulled,
        created: r.created,
        count: r.created,
      });
    } catch (e) {
      results.push({ channel: code, ok: false, count: 0, error: e instanceof Error ? e.message : "failed" });
    }
  }
  const cj = await syncCjSourcingOrders().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  return NextResponse.json({ results, cj });
}
