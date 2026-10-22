import { NextResponse } from "next/server";
import { enqueueExport, listExports, processExportQueue, purgeMockExportJobs } from "@/lib/export/jobs";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json({ jobs: await listExports(80) });
}

/** POST { documentId, channels, run?, options?, pricing?, extraInfo? } | { process: true } | { purgeMock: true } */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as {
      documentId?: number;
      channels?: string[];
      run?: boolean;
      processOnly?: boolean;
      process?: boolean;
      purgeMock?: boolean;
      options?: Array<{ name: string; sku?: string; priceUsd?: number; attributes?: Record<string, string> }>;
      pricing?: { sellPriceUsd?: number };
      extraInfo?: Record<string, string>;
    };
    if (body.purgeMock) {
      return NextResponse.json({ removed: await purgeMockExportJobs() });
    }
    if (body.processOnly || body.process) {
      const processed = await processExportQueue(20);
      return NextResponse.json({ processed });
    }
    if (!body.documentId || !body.channels?.length) return bad("documentId and channels required");
    const jobs = await enqueueExport({
      documentId: body.documentId,
      channels: body.channels,
      options: body.options,
      pricing: body.pricing,
      extraInfo: body.extraInfo,
    });
    const processed = body.run === false ? [] : await processExportQueue(20);
    return NextResponse.json({ jobs, processed });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "export failed", 500);
  }
}