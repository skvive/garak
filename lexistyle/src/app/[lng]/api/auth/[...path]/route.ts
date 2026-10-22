// filepath: src/app/api/auth/[...path]/route.ts
import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * Neon Auth 핸들러 패스스루.
 * Neon Auth 미활성(플레이스홀더) 상태에서는 실제 핸들러가 502로 터지므로,
 * 자체 Google OAuth만 쓰는 현 구성에서 get-session 등은 "세션 없음(200)"으로 곱게 응답.
 * Neon Auth 활성 시(NEON_AUTH_* 설정) 정식 핸들러로 위임.
 */
const neonHandler = authConfigured ? auth.handler() : null;

function fallback(): Response {
  // BetterAuth get-session 형태에 맞춘 비인증 응답 (콘솔 502 제거)
  return NextResponse.json({ data: null, error: null }, { status: 200 });
}

export async function GET(req: Request, ctx: unknown): Promise<Response> {
  if (!neonHandler) return fallback();
  try {
    return await (neonHandler.GET as (r: Request, c: unknown) => Promise<Response>)(req, ctx);
  } catch {
    return fallback();
  }
}

export async function POST(req: Request, ctx: unknown): Promise<Response> {
  if (!neonHandler) return fallback();
  try {
    return await (neonHandler.POST as (r: Request, c: unknown) => Promise<Response>)(req, ctx);
  } catch {
    return fallback();
  }
}
