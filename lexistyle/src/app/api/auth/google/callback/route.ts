import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Google OAuth 콜백 — code 교환 → userinfo → 서명 세션 쿠키 발급 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  // locale 유지를 위해 state 쿠키에서 locale 추출 (실패 시 기본 ko)
  let locale = "ko";
  let storedState: string | undefined;
  const stateCookieRaw = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)lexi_oauth_state=([^;]+)/)?.[1];
  if (stateCookieRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateCookieRaw));
      storedState = parsed.state;
      locale = parsed.locale || "ko";
    } catch {
      // legacy single-value format
      storedState = stateCookieRaw;
    }
  }

  const fail = (reason: string) => {
    // 각 locale별 경로로 리다이렉트 (회원가입 실패 → sign-up, 로그인 실패 → sign-in)
    return NextResponse.redirect(`${origin}/${locale}/auth/sign-up?error=${encodeURIComponent(reason)}`, 302);
  };

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google-env-missing");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== storedState) return fail("state-mismatch");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("token-exchange-failed");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail("no-access-token");

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return fail("userinfo-failed");
  const profile = (await userRes.json()) as { email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!profile.email || profile.email_verified === false) return fail("email-unverified");

  // 관리자 이메일 목록 확인
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  const isAdmin = adminEmails.includes(profile.email.toLowerCase());

  // 사용자 DB 저장/업데이트
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const existingUser = await db().query.users.findFirst({
      where: eq(users.email, profile.email),
    });

    if (!existingUser) {
      // 신규 사용자 등록 (회원가입)
      await db().insert(users).values({
        email: profile.email,
        name: profile.name || null,
        image: profile.picture || null,
        role: isAdmin ? "admin" : "customer",
        status: "active",
      });
    } else {
      // 기존 사용자 정보 업데이트 (로그인)
      await db().update(users)
        .set({
          name: profile.name || existingUser.name,
          image: profile.picture || existingUser.image,
          role: isAdmin ? "admin" : existingUser.role,
          updatedAt: new Date(),
        })
        .where(eq(users.email, profile.email));
    }
  } catch (error) {
    console.error("Failed to save user to database:", error);
    // DB 저장 실패해도 로그인은 진행
  }

  const role = isAdmin ? "admin" : "customer";
  const redirectPath = isAdmin ? `/admin/sourcing` : `/${locale}/account`;

  const res = NextResponse.redirect(`${origin}${redirectPath}`, 302);
  res.cookies.set(SESSION_COOKIE, await createSessionToken({ email: profile.email, name: profile.name, role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });
  res.cookies.set("lexi_oauth_state", "", { path: "/api/auth/google", maxAge: 0 });
  return res;
}