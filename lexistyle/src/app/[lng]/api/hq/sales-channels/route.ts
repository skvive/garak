import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { pullChannelOrders } from "@/lib/hq/services";
import { ensureSalesMeta, listSalesChannelCards, salesChannelKpis, SALES_CHANNEL_CATALOG } from "@/lib/hq/sales-channels";
import { listingStatsMap, sellerDashboardUrl } from "@/lib/hq/listing-stats";
import { getState, mutate } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

async function cardsWithStats() {
  const s = await getState();
  const cards = listSalesChannelCards(s);
  const commerceCodes = cards.filter((c) => c.family === "commerce").map((c) => c.hqCode ?? c.code);
  const stats = await listingStatsMap(s, commerceCodes);
  return cards.map((c) => {
    if (c.family !== "commerce") {
      return { ...c, listingStats: undefined, dashboardUrl: null as string | null };
    }
    const key = c.hqCode ?? c.code;
    return {
      ...c,
      listingStats: stats[key] ?? { pending: 0, live: 0, stopped: 0 },
      dashboardUrl: sellerDashboardUrl(c.code),
    };
  });
}

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const cards = await cardsWithStats();
  return NextResponse.json({ cards, kpis: salesChannelKpis(cards) });
}

/** PATCH { code, paused?, handle?, note? } */
export async function PATCH(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as {
    code?: string; paused?: boolean; handle?: string; note?: string;
  };
  if (!b.code || !SALES_CHANNEL_CATALOG.some((c) => c.code === b.code)) return bad("unknown channel");
  await mutate((s) => {
    const meta = ensureSalesMeta(s);
    const cur = meta[b.code!] ?? {};
    if (typeof b.paused === "boolean") cur.paused = b.paused;
    if (typeof b.handle === "string") cur.handle = b.handle.trim().replace(/^@/, "");
    if (typeof b.note === "string") cur.note = b.note.slice(0, 240);
    meta[b.code!] = cur;
    return true;
  });
  const cards = await cardsWithStats();
  return NextResponse.json({ cards, kpis: salesChannelKpis(cards) });
}

/** POST { action:'pull', code } */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { action?: string; code?: string };
  if (b.action !== "pull" || !b.code) return bad("action pull and code required");
  const def = SALES_CHANNEL_CATALOG.find((c) => c.code === b.code);
  if (!def?.hqCode) return bad("이 채널은 주문 인입이 없다", 422);
  try {
    const r = await pullChannelOrders(def.hqCode);
    const cards = await cardsWithStats();
    return NextResponse.json({ ok: true, pull: r, cards, kpis: salesChannelKpis(cards) });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "pull failed", 422);
  }
}
