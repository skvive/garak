import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { SALES_CHANNEL_CATALOG } from "@/lib/hq/sales-channels";
import { listingStatsForCode, sellerDashboardUrl } from "@/lib/hq/listing-stats";
import { getState } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

/** GET — DB 집계 + (가능 시) note. 실패 시 DB만 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const code = (await ctx.params).code;
  const def = SALES_CHANNEL_CATALOG.find((c) => c.code === code);
  if (!def) return bad("unknown channel", 404);
  if (def.family !== "commerce") {
    return NextResponse.json({
      code,
      listingStats: { pending: 0, live: 0, stopped: 0 },
      dashboardUrl: null,
      note: "콘텐츠 채널",
    });
  }
  const s = await getState();
  const listingStats = await listingStatsForCode(def.hqCode ?? code, s);
  return NextResponse.json({
    code,
    listingStats,
    dashboardUrl: sellerDashboardUrl(code),
    note: listingStats.note ?? null,
  });
}
