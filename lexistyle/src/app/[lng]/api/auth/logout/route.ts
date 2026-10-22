// filepath: src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/auth/demo";

export const dynamic = "force-dynamic";

/** 자체 세션(구글/데모) 로그아웃 */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
