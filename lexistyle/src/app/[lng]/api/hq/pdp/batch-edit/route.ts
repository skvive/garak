import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { batchEditPdp } from "@/lib/pdp/generate";

export const dynamic = "force-dynamic";

/** POST { documentIds, ctaLabel?, tonePrefix?, status? } */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as {
      documentIds?: number[];
      ctaLabel?: string;
      tonePrefix?: string;
      status?: string;
    };
    if (!body.documentIds?.length) return bad("documentIds required");
    const results = await batchEditPdp(body.documentIds, body);
    return NextResponse.json({ results });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "batch edit failed", 500);
  }
}
