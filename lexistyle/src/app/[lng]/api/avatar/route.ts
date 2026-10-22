import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emptyAvatar, AVATAR_COOKIE } from "@/lib/looks/store";
import { normalizePortrait, checkOrigin } from "@/lib/looks/photo";
import { FIT_DISCLAIMER } from "@/lib/looks/types";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() { return NextResponse.json(emptyAvatar(), { headers }); }
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const form = await req.formData();
    const file = form.get("photo");
    if (form.get("consent") !== "true" || !(file instanceof File)) throw new Error("사진을 선택하고 처리에 동의해 주세요.");
    return NextResponse.json({ status: "ready", imageUrl: await normalizePortrait(file), consentAt: new Date().toISOString(), disclaimer: FIT_DISCLAIMER }, { headers });
  } catch { return NextResponse.json({ error: "3MB 이하의 JPG·PNG·WEBP 사진과 동의를 확인해 주세요." }, { status: 400, headers }); }
}
export async function DELETE(req: Request) {
  try { checkOrigin(req); } catch { return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 403 }); }
  const jar = await cookies();
  jar.delete(AVATAR_COOKIE);
  jar.delete("lexi_fitting_owner");
  return NextResponse.json(emptyAvatar(), { headers });
}
