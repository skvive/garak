import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { enqueueCrafted, listShelf, promoteToShelf, type ShelfStage } from "@/lib/export/shelf";
import { enqueueExport, processExportQueue } from "@/lib/export/jobs";
import { updateShelf } from "@/lib/export/shelf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") as ShelfStage | null;
  const items = await listShelf(stage ?? undefined);
  return NextResponse.json({ items });
}

/**
 * POST
 * - { documentIds, stage?: "crafted" } → 제작목록 enqueue
 * - { action: "promote", ids } → 진열대기
 * - { action: "export", ids, channels } → enqueueExport + process
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as {
    documentIds?: number[];
    stage?: string;
    action?: string;
    ids?: number[];
    channels?: string[];
  };

  if (body.action === "promote") {
    if (!body.ids?.length) return bad("ids required");
    const items = await promoteToShelf(body.ids);
    return NextResponse.json({ items });
  }

  if (body.action === "export") {
    if (!body.ids?.length) return bad("ids required");
    if (!body.channels?.length) return bad("channels required");
    const jobs = [];
    for (const id of body.ids) {
      const { getShelf } = await import("@/lib/export/shelf");
      const row = await getShelf(id);
      if (!row || row.stage !== "shelf") return bad(`shelf #${id} not in shelf stage`, 422);
      // options/stock는 runOne → resolveCjExportOptions(CJ live)에서 자동 반영
      const created = await enqueueExport({
        documentId: row.documentId,
        channels: body.channels,
        pricing: row.sellPriceUsd ? { sellPriceUsd: Number(row.sellPriceUsd) } : undefined,
      });
      jobs.push(...created);
      await updateShelf(id, {
        channelsDesired: body.channels,
        meta: { ...(row.meta ?? {}), lastExportAt: new Date().toISOString() },
      });
    }
    const processed = await processExportQueue(Math.max(10, jobs.length));
    return NextResponse.json({ jobs, processed });
  }

  if (!body.documentIds?.length) return bad("documentIds required");
  const items = await enqueueCrafted(body.documentIds);
  return NextResponse.json({ items });
}
