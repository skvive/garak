import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { listPurchaseInbox } from "@/lib/hq/purchase-inbox";
import { getState } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

/** GET — 판매채널 주문 인박스 (상품·발주·정산 조인) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") ?? undefined;
  const stage = url.searchParams.get("stage") ?? undefined;
  const data = listPurchaseInbox(await getState());
  let rows = data.rows;
  if (channel && channel !== "all") rows = rows.filter((r) => r.channel.code === channel);
  if (stage && stage !== "all") rows = rows.filter((r) => r.stage === stage);
  return NextResponse.json({ ...data, rows });
}
