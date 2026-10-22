// filepath: src/lib/auth/demo.ts
/**
 * 데모 로그인 — Neon Auth 활성화 전 임시 체험용.
 * DEMO_LOGIN=1 인 배포에서만 동작하며(기본 잠금), 플래그 제거+재배포로 즉시 비활성화된다.
 * 쿠키는 서버 시크릿 HMAC 서명값이라 위조 불가하지만, 데모 모드 자체가
 * "버튼만 누르면 입장"이므로 공개 체험 용도로만 켤 것. (Edge/Node 겸용 Web Crypto)
 */

export const DEMO_COOKIE = "lexi_demo";

export const demoEnabled = () => process.env.DEMO_LOGIN === "1";

const enc = new TextEncoder();

export async function demoCookieValue(): Promise<string> {
  const secret = process.env.HQ_API_TOKEN || "lexi-demo-fallback";
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("lexi-demo-session-v1"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isDemoCookieValid(value: string | null | undefined): Promise<boolean> {
  if (!demoEnabled() || !value) return false;
  return value === (await demoCookieValue());
}

/** Request의 Cookie 헤더에서 데모 쿠키를 꺼내 검증 (route handler용) */
export async function isDemoRequest(req: Request): Promise<boolean> {
  const m = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)lexi_demo=([^;]+)/);
  return isDemoCookieValid(m?.[1]);
}
