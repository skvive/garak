// filepath: src/lib/auth/session.ts
/**
 * 자체 세션 쿠키 (Google OAuth 로그인용) — Edge/Node 겸용 Web Crypto HMAC 서명.
 * 형식: base64url(JSON{email,name,exp}) + "." + HMAC-SHA256 hex
 * Neon Auth와 독립적으로 동작하며, Neon Auth 활성화 후에도 병행 사용 가능.
 */

export const SESSION_COOKIE = "lexi_session";

export type SessionUser = { email: string; name?: string; role?: "admin" | "customer" };

const enc = new TextEncoder();
const secret = () =>
  process.env.AUTH_SECRET || process.env.HQ_API_TOKEN || "dev-insecure-session-secret";

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const b64url = {
  encode: (s: string) =>
    btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: (s: string) =>
    decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))),
};

export async function createSessionToken(user: SessionUser, maxAgeSec = 60 * 60 * 24 * 7) {
  const payload = b64url.encode(
    JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + maxAgeSec }),
  );
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (sig !== (await hmac(payload))) return null;
  try {
    const data = JSON.parse(b64url.decode(payload)) as SessionUser & { exp: number };
    if (!data.email || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: data.email, name: data.name };
  } catch {
    return null;
  }
}

/** Request Cookie 헤더에서 세션 토큰 추출 (route handler / middleware용) */
export function sessionTokenFromCookieHeader(header: string | null | undefined): string | null {
  const m = (header ?? "").match(/(?:^|;\s*)lexi_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
