import { listAssets } from "@/lib/studio/assets";
import { sessionEmail } from "@/lib/shorts/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope") === "public" ? "public" : "mine";
  const email = await sessionEmail();
  if (scope === "mine" && !email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const assets = await listAssets(email, scope);
  return NextResponse.json({ assets });
}
