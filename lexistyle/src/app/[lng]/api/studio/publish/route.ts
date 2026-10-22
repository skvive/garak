import { NextResponse } from "next/server";
import { listPublishEvents, recordPublishMetrics } from "@/lib/studio/store";
import { publishDocumentToCafe24 } from "@/lib/studio/publish";
import { bad, studioActor, unauthorized } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await studioActor())) return unauthorized();
  return NextResponse.json({ items: await listPublishEvents() });
}

export async function POST(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!body.documentId) throw new Error("documentId required");
    return NextResponse.json(
      await publishDocumentToCafe24({
        documentId: Number(body.documentId),
        actor,
        version: body.version ? Number(body.version) : undefined,
      }),
    );
  } catch (error) {
    return bad(error, 422);
  }
}

export async function PATCH(req: Request) {
  if (!(await studioActor())) return unauthorized();
  try {
    const body = await req.json();
    if (!body.id || !body.metrics) throw new Error("id, metrics required");
    return NextResponse.json({
      item: await recordPublishMetrics(Number(body.id), {
        impressions: Number(body.metrics.impressions || 0),
        clicks: Number(body.metrics.clicks || 0),
        conversions: Number(body.metrics.conversions || 0),
        revenue: Number(body.metrics.revenue || 0),
      }),
    });
  } catch (error) {
    return bad(error);
  }
}
