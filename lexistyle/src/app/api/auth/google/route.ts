import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh", "ms", "th", "vi"];

/** Google OAuth 시작 — 인가 URL로 리다이렉트 (state 쿠키로 CSRF 방지) */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID 미설정" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const url = new URL(req.url);

  // 요청 경로에서 locale 추출 (/ko/... → ko)
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const locale = SUPPORTED_LOCALES.includes(pathSegments[0]) ? pathSegments[0] : "ko";

  const state = crypto.randomUUID();
  // locale을 state cookie에 함께 저장 (JSON)
  const stateData = JSON.stringify({ state, locale });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
  res.cookies.set("lexi_oauth_state", stateData, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}