import { refreshAsset } from "@/lib/studio/assets";
import { sessionEmail } from "@/lib/shorts/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const asset = await refreshAsset(Number(id), email);
  if (!asset) return NextResponse.json({ error: "없거나 권한이 없습니다." }, { status: 404 });
  return NextResponse.json({ asset });
}
