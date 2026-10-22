import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isDemoRequest } from "@/lib/auth/demo";

/**
 * HQ API 인증 — 스펙 §0 D2
 * 1) 서버-서버(loyadbeta 콘솔): Authorization: Bearer ${HQ_API_TOKEN}
 * 2) lexistyle 자체 admin UI: 관리자 세션 쿠키
 * 개발 모드(HQ_API_TOKEN 미설정 + 비프로덕션)는 통과.
 */
export async function hqActor(req: Request): Promise<string | null> {
  const token = process.env.HQ_API_TOKEN;
  const header = req.headers.get("authorization");
  if (token && header === `Bearer ${token}`) return "hq-api";
  const session = await requireAdmin().catch(() => null);
  if (session?.user?.email) return session.user.email;
  if (await isDemoRequest(req)) return "demo-admin";
  if (!token && process.env.NODE_ENV !== "production") return "dev";
  // 데모 개방: HQ_ALLOW_ANON=1 이면 로컬/개발에서 토큰이 있어도 통과
  // (Vercel에 HQ_API_TOKEN이 있어도 .env에 복사되면 UI가 전부 401 빈화면이 됨)
  if (process.env.HQ_ALLOW_ANON === "1" && process.env.NODE_ENV !== "production") {
    return "anon-demo";
  }
  if (!token && process.env.HQ_ALLOW_ANON === "1") return "anon-demo";
  return null;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
