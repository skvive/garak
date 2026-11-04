// filepath: src/lib/auth/admin.ts
import { cookies } from "next/headers";
import { cache } from "react";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { auth, authConfigured } from "./server";
import { DEMO_COOKIE, isDemoCookieValid } from "./demo";
import { SESSION_COOKIE, verifySessionToken } from "./session";

const DEMO_ADMIN = {
  user: {
    id: "demo:admin",
    email: "demo@lexi.local",
    name: "Demo Admin",
    image: null as string | null,
  },
};

export async function requireSession() {
  // 0) 데모 로그인 쿠키 (DEMO_LOGIN=1)
  try {
    const jar = await cookies();
    if (await isDemoCookieValid(jar.get(DEMO_COOKIE)?.value)) {
      return DEMO_ADMIN;
    }
  } catch {
    /* cookies() 사용 불가 컨텍스트 */
  }

  // 1) 자체 Google OAuth 세션 (Neon Auth와 독립)
  try {
    const jar = await cookies();
    const user = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
    if (user) {
      return {
        user: {
          id: `google:${user.email}`,
          email: user.email,
          name: user.name ?? user.email,
          image: null as string | null,
        },
      };
    }
  } catch {
    /* cookies() 사용 불가 컨텍스트 → Neon Auth로 폴백 */
  }
  // 2) Neon Auth 세션
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) return null;
    return session;
  } catch {
    return null; // Neon Auth 미설정/네트워크 오류 시 게스트로 처리
  }
}

/**
 * Verified Neon Auth administrator. A public.users email reservation alone
 * never grants access: the signed-in account must prove email ownership.
 * Legacy session/demo cookies cannot satisfy this guard.
 */
export const requireVerifiedNeonAdmin = cache(async () => {
  if (!authConfigured || !hasDb()) return null;
  try {
    const { data: session } = await auth.getSession();
    const user = session?.user as
      | { id?: string; email?: string; emailVerified?: boolean; role?: string; banned?: boolean }
      | undefined;
    if (!user?.id || !user.email || user.emailVerified !== true || user.banned) return null;

    // Explicit Neon Auth admins remain supported, but always require a
    // verified email. The storefront's public.users role is checked below.
    if (user.role === "admin") return session;

    const allowed = await db().execute(sql`
      SELECT id FROM public.users
      WHERE lower(email) = lower(${user.email})
        AND role = 'admin'
        AND status = 'active'
        AND is_dummy = false
        AND deleted_at IS NULL
        AND (auth_user_id IS NULL OR auth_user_id::text = ${user.id})
      LIMIT 1
    `);
    return allowed.rows.length ? session : null;
  } catch {
    return null;
  }
});

export async function requireAdmin() {
  const verified = await requireVerifiedNeonAdmin();
  if (verified) return verified;
  const session = await requireSession();
  if (!session?.user?.email) return null;
  // 데모 세션은 ADMIN_EMAILS 화이트리스트와 무관하게 HQ 허용
  if (session.user.id === "demo:admin" || session.user.email === "demo@lexi.local") {
    return session;
  }
  // Neon Auth Managed Better Auth exposes the account role on the session.
  // Keep this server-side check so an explicitly promoted Neon Auth admin does
  // not also need to be duplicated in an environment allowlist.
  if ((session.user as { role?: string }).role === "admin") return session;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return process.env.NODE_ENV === "production" ? null : session; // 미설정: 개발에서만 로그인 사용자 허용
  if (!allow.includes(session.user.email.toLowerCase())) return null;
  return session;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  if (email === "demo@lexi.local") return true;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return true;
  return allow.includes(email.toLowerCase());
}
