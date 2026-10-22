import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getShelf, markPriced, updateShelf, type ShelfOption, type ShelfStage } from "@/lib/export/shelf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) return bad("invalid id");
  const item = await getShelf(id);
  if (!item) return bad("not found", 404);
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) return bad("invalid id");
  const body = (await req.json().catch(() => ({}))) as {
    stage?: ShelfStage;
    sellPriceUsd?: number | string;
    stockDefault?: number;
    options?: ShelfOption[];
    channelsDesired?: string[];
    title?: string;
    titleKo?: string;
    priced?: boolean;
  };

  try {
    const item = body.priced
      ? await markPriced(id, {
          sellPriceUsd: body.sellPriceUsd,
          stockDefault: body.stockDefault,
          options: body.options,
          channelsDesired: body.channelsDesired,
          title: body.title,
          titleKo: body.titleKo,
        })
      : await updateShelf(id, {
          stage: body.stage,
          sellPriceUsd: body.sellPriceUsd,
          stockDefault: body.stockDefault,
          options: body.options,
          channelsDesired: body.channelsDesired,
          title: body.title,
          titleKo: body.titleKo,
        });
    return NextResponse.json({ item });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "update failed", 422);
  }
}
