import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { studioActor } from "@/lib/seller-studio/auth";
import { appConfig, consumeOauth, sealTokens, signedPartnerUrl } from "@/lib/seller-studio/security";
import { audit, transact } from "@/lib/seller-studio/store";
import { inShop } from "@/lib/seller-studio/shopee";
import { getShopInfo } from "@/lib/channels/shopee/api";
import { StudioError } from "@/lib/seller-studio/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const actor = await studioActor(req);
    const q = req.nextUrl.searchParams;
    const state = q.get("state") || "";
    if (req.cookies.get("seller_studio_oauth")?.value !== state) throw new StudioError("상점 연결 쿠키가 일치하지 않습니다.", 403);
    const shopId = q.get("shop_id") || "";
    const code = q.get("code") || "";
    if (!/^\d+$/.test(shopId) || !Number.isSafeInteger(Number(shopId)) || Number(shopId) <= 0 || !code || code.length > 2000) throw new StudioError("상점 연결 응답이 올바르지 않습니다.");
    await transact(actor.id, async (w, db, checkpoint) => {
      consumeOauth(w, state);
      await checkpoint();
      if (Object.values(db.workspaces).some(other => other.id !== w.id && other.shops.some(s => s.shopId === shopId))) throw new StudioError("다른 작업공간에 이미 연결된 상점입니다.", 409);
      if (w.shops.length >= 2 && !w.shops.some(s => s.shopId === shopId)) throw new StudioError("파일럿은 상점 2개까지 연결합니다.");
      const config = appConfig();
      const response = await fetch(signedPartnerUrl("/api/v2/auth/token/get"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(config.partnerId) }), signal: AbortSignal.timeout(30000) });
      const tokens = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
      if (!response.ok || tokens.error || !tokens.access_token || !tokens.refresh_token) throw new StudioError("Shopee 토큰 교환 실패. 개발자 권한과 연결 주소를 확인하세요.", 502);
      const existing = w.shops.find(s => s.shopId === shopId);
      const shop = { id: existing?.id || randomUUID(), shopId, name: shopId, region: "SG", tokens: sealTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }, `${w.id}:${shopId}`) };
      const info = await inShop(w, shop, checkpoint, () => getShopInfo());
      if (info.region !== "SG") throw new StudioError("첫 버전은 싱가포르 상점만 연결합니다.");
      shop.name = info.shop_name || shopId;
      w.shops = [...w.shops.filter(s => s.shopId !== shopId), shop];
      audit(w, "상점 연결", shop.name);
    });
    const res = NextResponse.redirect(new URL("/ko/seller-studio?connected=1", req.url));
    res.cookies.delete("seller_studio_oauth");
    return res;
  } catch (e) {
    return NextResponse.json({ error: e instanceof StudioError ? e.message : "상점 인증에 실패했습니다. 연결을 다시 시작하세요." }, { status: e instanceof StudioError ? e.status : 500 });
  }
}
