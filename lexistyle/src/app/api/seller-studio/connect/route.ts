import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { studioActor } from "@/lib/seller-studio/auth";
import { appConfig, nonceHash, signedPartnerUrl } from "@/lib/seller-studio/security";
import { transact } from "@/lib/seller-studio/store";
import { StudioError } from "@/lib/seller-studio/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const actor = await studioActor(req);
    appConfig();
    const configured = process.env.SELLER_STUDIO_PUBLIC_URL;
    if (!configured) throw new StudioError("Shopee에 등록한 SELLER_STUDIO_PUBLIC_URL 설정이 필요합니다.", 503);
    const base = new URL(configured);
    if (base.origin !== new URL(req.url).origin || (base.protocol !== "https:" && !actor.local)) throw new StudioError("서비스 주소와 상점 연결 주소가 일치하지 않습니다.", 403);
    const state = randomBytes(32).toString("base64url");
    await transact(actor.id, w => { w.oauth = { hash: nonceHash(state), expires: Date.now() + 10 * 60_000 }; });
    const callback = new URL("/api/seller-studio/callback", base);
    callback.searchParams.set("state", state);
    const target = signedPartnerUrl("/api/v2/shop/auth_partner");
    target.searchParams.set("redirect", callback.toString());
    const res = NextResponse.redirect(target);
    res.cookies.set("seller_studio_oauth", state, { httpOnly: true, secure: base.protocol === "https:", sameSite: "lax", path: "/api/seller-studio", maxAge: 600 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e instanceof StudioError ? e.message : "상점 연결을 시작하지 못했습니다." }, { status: e instanceof StudioError ? e.status : 500 });
  }
}
