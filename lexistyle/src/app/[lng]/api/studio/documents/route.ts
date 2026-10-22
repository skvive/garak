import { NextResponse } from "next/server";
import { createDocument, listDocuments, updateDocument } from "@/lib/studio/store";
import { bad, studioActor, unauthorized } from "@/lib/studio/http";
import { DOCUMENT_KINDS } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await studioActor())) return unauthorized();
  const url = new URL(req.url);
  return NextResponse.json({
    items: await listDocuments({
      status: url.searchParams.get("status") || undefined,
      kind: url.searchParams.get("kind") || undefined,
    }),
  });
}

export async function POST(req: Request) {
  const actor = await studioActor();
  if (!actor) return unauthorized();
  try {
    const body = await req.json();
    if (!DOCUMENT_KINDS.includes(body.kind)) throw new Error("invalid document kind");
    if (!body.title) throw new Error("title required");
    return NextResponse.json({
      item: await createDocument({
        kind: body.kind,
        title: String(body.title),
        locale: body.locale,
        cafe24ProductNo: body.cafe24ProductNo ? Number(body.cafe24ProductNo) : undefined,
        body: body.body ?? {},
        renderedHtml: body.renderedHtml,
        actor,
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
    if (!body.id) throw new Error("id required");
    return NextResponse.json({
      item: await updateDocument(Number(body.id), {
        title: body.title,
        body: body.body,
        renderedHtml: body.renderedHtml,
        status: body.status,
        actor,
      }),
    });
  } catch (error) {
    return bad(error, 422);
  }
}
