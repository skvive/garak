// filepath: src/app/api/auth/demo/route.ts
import { NextResponse } from "next/server";
import { DEMO_COOKIE, demoCookieValue, demoEnabled } from "@/lib/auth/demo";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function safeNext(raw: string | null): string {
  if (!raw) return "/hq";
  // open redirect 방지 — 동일 오리진 상대 경로만
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/hq";
  return raw;
}

/** 데모 로그인: DEMO_LOGIN=1일 때만 서명 쿠키를 심고 HQ로 보낸다. */
export async function POST(req: Request) {
  if (!demoEnabled()) {
    return NextResponse.json({ error: "demo login disabled" }, { status: 404 });
  }
  const url = new URL(req.url);
  let next = safeNext(url.searchParams.get("next"));
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const fromForm = form.get("next");
      if (typeof fromForm === "string") next = safeNext(fromForm);
    }
  } catch {
    /* body 없음(fetch POST)이면 query만 사용 */
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(DEMO_COOKIE, await demoCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24시간
  });
  // 세션 토큰도 함께 발급 — requireAdmin()이 이메일을 확인하므로 관리자 이메일로 발급
  const adminEmail = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() || "demo@lexi.style";
  res.cookies.set(SESSION_COOKIE, await createSessionToken({ email: adminEmail, name: "Demo Admin" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}

/** 데모 로그아웃 */
export async function DELETE(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
