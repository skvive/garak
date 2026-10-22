import { NextResponse } from "next/server";
import { createDecision, listDecisions, resolveDecision } from "@/lib/studio/store";
import { bad, studioActor, unauthorized } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await studioActor())) return unauthorized();
  return NextResponse.json({ items: await listDecisions() });
}

export async function POST(req: Request) {
  if (!(await studioActor())) return unauthorized();
  try {
    const body = await req.json();
    if (!body.code || !body.question || !body.defaultDecision) {
      throw new Error("code, question, defaultDecision required");
    }
    return NextResponse.json({
      item: await createDecision({
        code: String(body.code),
        priority: body.priority,
        question: String(body.question),
        defaultDecision: String(body.defaultDecision),
        impact: body.impact,
      }),
    });
  } catch (error) {
    return bad(error);
  }
}

export async function PATCH(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!body.id || !body.finalDecision) throw new Error("id, finalDecision required");
    return NextResponse.json({
      item: await resolveDecision(Number(body.id), {
        finalDecision: String(body.finalDecision),
        actor,
      }),
    });
  } catch (error) {
    return bad(error);
  }
}
