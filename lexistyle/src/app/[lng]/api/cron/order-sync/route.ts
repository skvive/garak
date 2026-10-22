import { NextResponse } from "next/server";
import { coupangKeysConfigured } from "@/lib/channels/coupang/constants";
import { shopeeFullyConfigured } from "@/lib/channels/shopee/constants";
import { cjConfigured } from "@/lib/sourcing/connectors/cjdropshipping";
import { hasDb } from "@/db";
import { syncCjSourcingOrders } from "@/lib/hq/cj-order-sync";
import { pullChannelOrders } from "@/lib/hq/services";
import { getState } from "@/lib/hq/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 미설정 채널은 데모 주문을 돌려주므로 실계정 연결된 채널만 */
const LIVE: Record<string, () => boolean> = {
  coupang: coupangKeysConfigured,
  shopee: shopeeFullyConfigured,
};

/**
 * 판매채널 주문 → 구매요청 → CJ 스토어주문(createOrderV2 + 장바구니 확정) → CJ 상태·송장 회신.
 * CJ "매장 주문 동기화"는 CJ 인증 스토어만 끌어오므로 쿠팡·쇼피는 이 크론이 CJ API 스토어로 넣는다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasDb()) {
    return NextResponse.json(
      { error: "DATABASE_URL required: live order sync needs persistent duplicate protection" },
      { status: 503 },
    );
  }
  if (!cjConfigured()) {
    return NextResponse.json(
      { error: "CJ_API_EMAIL and CJ_API_KEY required: mock sourcing is disabled for live order sync" },
      { status: 503 },
    );
  }
  const s = await getState();
  const paused = s.salesChannelMeta ?? {};
  const codes = s.channels.map((c) => c.code).filter((code) => LIVE[code]?.() && !paused[code]?.paused);
  const channels = [];
  for (const code of codes) {
    try {
      const r = await pullChannelOrders(code);
      channels.push({ channel: code, ok: true, pulled: r.pulled, created: r.created, autoSourced: r.autoSourced, sampleMirrors: r.sampleMirrors });
    } catch (e) {
      channels.push({ channel: code, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const cj = await syncCjSourcingOrders().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  return NextResponse.json({ channels, cj });
}
