import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lookCatalog } from "@/lib/looks/catalog";
import { createVtoJob } from "@/lib/looks/vto";
import { validateSlots, selectItems } from "@/lib/looks/validation";
import { normalizePortrait, checkOrigin } from "@/lib/looks/photo";
import { signJob } from "@/lib/looks/job-ticket";
import { reserveGeneration } from "@/lib/looks/quota";
import { wanConfigured } from "@/lib/wan/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  return NextResponse.json({ available: wanConfigured(), provider: "Alibaba Cloud Wan", dailyLimit: 3 }, { headers });
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!wanConfigured()) return NextResponse.json({ error: "피팅 서비스 연결을 준비 중입니다. 잠시 후 이용해 주세요." }, { status: 503, headers });
    if (Number(req.headers.get("content-length")) > 3_500_000) return NextResponse.json({ error: "사진은 3MB 이하로 선택해 주세요." }, { status: 413, headers });
    const form = await req.formData();
    if (form.get("consent") !== "true" || form.get("adult") !== "true") throw new Error("성인 본인 사진 및 AI 처리 동의를 확인해 주세요.");
    const photo = form.get("photo");
    if (!(photo instanceof File)) throw new Error("먼저 얼굴 사진을 선택해 주세요.");
    const slots = validateSlots(JSON.parse(String(form.get("slots") || "{}")));
    if (!Object.keys(slots).length) throw new Error("입혀볼 상품을 하나 이상 선택해 주세요.");
    const items = selectItems(slots, await lookCatalog());
    const modelImage = await normalizePortrait(photo);
    const occasion = ["일상", "출근", "여행", "모임"].includes(String(form.get("occasion"))) ? String(form.get("occasion")) : "일상";
    const jar = await cookies();
    const owner = jar.get("lexi_fitting_owner")?.value || crypto.randomUUID();
    await reserveGeneration(req);
    let job;
    try { job = await createVtoJob({ modelImage, items, occasion }); }
    catch { return NextResponse.json({ error: "이미지 서비스가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502, headers }); }
    jar.set("lexi_fitting_owner", owner, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 3600 });
    const token = signJob({ id: job.id, owner, exp: Date.now() + 30 * 60_000 });
    return NextResponse.json({ ...job, token }, { status: 202, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "요청을 확인해 주세요.";
    const safe = /[가-힣]/.test(message) ? message : "요청을 처리하지 못했습니다. 사진을 다시 선택하거나 잠시 후 이용해 주세요.";
    return NextResponse.json({ error: safe }, { status: /3회/.test(safe) ? 429 : 400, headers });
  }
}
