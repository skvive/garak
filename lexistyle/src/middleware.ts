import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { authConfigured } from "@/lib/auth/server";
import { DEMO_COOKIE, isDemoCookieValid } from "@/lib/auth/demo";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const DEFAULT_LNG = "ko";
const SUPPORTED = new Set(["ko", "en", "ja", "zh", "ms", "th", "vi"]);

const neonAuthMiddleware = authConfigured
  ? auth.middleware({ loginUrl: "/auth/sign-in" })
  : undefined;

function isProtected(pathname: string): boolean {
  const protectedSuffixes = [
    "/admin", "/admin/", "/hq", "/hq/", "/studio", "/studio/",
    // 내부 작업·검수용 화면 — 공개 노출 금지
    "/coupang-results", "/pdp-preview", "/preview", "/ui-kit", "/shorts/dashboard",
  ];
  const segments = pathname.split("/").filter(Boolean);
  const stripped = segments.length >= 2 ? `/${segments.slice(1).join("/")}` : pathname;
  return protectedSuffixes.some((s) => stripped.startsWith(s));
}

function isAuthPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const stripped = segments.length >= 2 ? `/${segments.slice(1).join("/")}` : pathname;
  return stripped.startsWith("/auth/");
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 루트 "/" → "/ko" redirect (accept-language 지원)
  if (pathname === "/") {
    const acceptLang = req.headers.get("accept-language") || "";
    const pref = acceptLang
      .split(",")
      .map((s) => s.split("-")[0].toLowerCase())
      .find((l) => SUPPORTED.has(l));
    const lng = pref || DEFAULT_LNG;
    req.nextUrl.pathname = `/${lng}/`;
    return NextResponse.redirect(req.nextUrl);
  }

  const first = pathname.split("/")[1];
  if (first && !SUPPORTED.has(first)) {
    req.nextUrl.pathname = `/ko${pathname}`;
    return NextResponse.redirect(req.nextUrl);
  }

  // auth 경로는 middleware 건너뜀 (Neon Auth middleware가 방해하지 않도록)
  if (isAuthPath(pathname)) {
    return NextResponse.next();
  }

  // 보호 경로 + authConfigured가 true일 때만 Neon Auth 적용
  if (isProtected(pathname) && neonAuthMiddleware) {
    if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
    if (await isDemoCookieValid(req.cookies.get(DEMO_COOKIE)?.value)) return NextResponse.next();
    return (neonAuthMiddleware as unknown as (r: NextRequest) => Promise<Response>)(req);
  }

  return NextResponse.next();
}

export const config = {
  // 확장자 있는 public 정적 파일(sample3/*.html·webp 등)은 locale redirect 제외
  matcher: ["/((?!api|_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
}