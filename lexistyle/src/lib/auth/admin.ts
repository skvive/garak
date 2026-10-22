// filepath: src/lib/auth/admin.ts
import { cookies } from "next/headers";
import { auth } from "./server";
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

export async function requireAdmin() {
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
