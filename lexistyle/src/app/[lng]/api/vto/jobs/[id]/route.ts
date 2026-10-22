import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJob } from "@/lib/looks/job-ticket";
import { getVtoJob } from "@/lib/looks/vto";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const { id } = await ctx.params;
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const owner = (await cookies()).get("lexi_fitting_owner")?.value;
    if (!owner || verifyJob(token, owner).id !== id) throw new Error("invalid");
  } catch { return NextResponse.json({ error: "작업 인증이 만료되었습니다. 다시 생성해 주세요." }, { status: 403, headers }); }
  try { return NextResponse.json(await getVtoJob(id), { headers }); }
  catch { return NextResponse.json({ error: "생성 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요." }, { status: 502, headers }); }
}
