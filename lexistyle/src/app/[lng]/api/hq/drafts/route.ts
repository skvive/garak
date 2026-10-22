import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { generateDraftsForCollection } from "@/lib/renewal/generate";
import { getState } from "@/lib/hq/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET ?id= → renderedHtml 포함 단건 (미리보기) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const id = Number(new URL(req.url).searchParams.get("id"));
  const s = await getState();
  const draft = s.drafts.find((d) => d.id === id);
  if (!draft) return bad("not found", 404);
  return NextResponse.json(draft);
}

/** POST {collectionId} → 컬렉션 승인분 일괄 리뉴얼 (loyadbeta AI 잡의 대체 지점) */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  if (!b.collectionId) return bad("collectionId required");
  return NextResponse.json(await generateDraftsForCollection(Number(b.collectionId), actor));
}
