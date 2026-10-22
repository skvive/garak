import { createGeneration, type StudioKind } from "@/lib/studio/assets";
import { sessionEmail } from "@/lib/shorts/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const KINDS = new Set(["image", "video", "avatar"]);

export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const body = (await req.json()) as { kind?: string; prompt?: string; ratio?: string };
    const kind = (KINDS.has(body.kind ?? "") ? body.kind : "image") as StudioKind;
    const asset = await createGeneration(email, kind, body.prompt ?? "", body.ratio ?? "1:1");
    return NextResponse.json({ asset }, { status: 202 });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    const message = e instanceof Error ? e.message : "생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status });
  }
}
