import { NextResponse } from "next/server";
import { createTheme, listThemes, updateTheme } from "@/lib/studio/store";
import { bad, studioActor, unauthorized } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await studioActor())) return unauthorized();
  return NextResponse.json({ items: await listThemes() });
}

export async function POST(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!body.name || !body.tokens) throw new Error("name, tokens required");
    return NextResponse.json({
      item: await createTheme({
        name: String(body.name),
        tokens: body.tokens,
        status: body.status,
        actor,
      }),
    });
  } catch (error) {
    return bad(error);
  }
}

export async function PATCH(req: Request) {
  if (!(await studioActor())) return unauthorized();
  try {
    const body = await req.json();
    if (!body.id) throw new Error("id required");
    return NextResponse.json({
      item: await updateTheme(Number(body.id), {
        name: body.name,
        tokens: body.tokens,
        status: body.status,
      }),
    });
  } catch (error) {
    return bad(error);
  }
}
