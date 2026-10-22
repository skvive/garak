import { NextResponse } from "next/server";
import { createSection, listSections, updateSection } from "@/lib/studio/store";
import { bad, studioActor, unauthorized } from "@/lib/studio/http";
import { STUDIO_SLOTS } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const publicFeed = url.searchParams.get("public") === "1";
  if (!publicFeed && !(await studioActor())) return unauthorized();
  return NextResponse.json({
    items: await listSections({ publishedOnly: publicFeed }),
  });
}

export async function POST(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!STUDIO_SLOTS.includes(body.slot)) throw new Error("invalid slot");
    if (!body.title || !body.payload) throw new Error("title, payload required");
    return NextResponse.json({
      item: await createSection({
        slot: body.slot,
        title: String(body.title),
        payload: body.payload,
        sort: Number(body.sort || 0),
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
      item: await updateSection(Number(body.id), body),
    });
  } catch (error) {
    return bad(error);
  }
}
