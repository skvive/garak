import { NextResponse } from "next/server";
import { CAFE24_REDIRECT_PATH, cafe24Scopes } from "@/lib/cafe24/config";
import { exchangeCode } from "@/lib/cafe24/oauth";

export const dynamic = "force-dynamic";

/** GET /api/cafe24/oauth/callback — code → 토큰 교환·저장 후 콘솔로 복귀 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const done = (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    const res = NextResponse.redirect(`${origin}/admin/cafe24?${q}`, 302);
    res.cookies.set("cafe24_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  };

  // 1) 카페24가 에러를 돌려준 경우(권한 거부·잘못된 요청 등) — 이게 진짜 원인일 때가 많음
  const cafeErr = url.searchParams.get("error");
  if (cafeErr) {
    const desc = url.searchParams.get("error_description") ?? "";
    // invalid_scope: 요청 scope가 개발자센터 앱 등록 권한과 불일치 — 운영자가 바로 조치하도록 안내
    const hint =
      cafeErr === "invalid_scope"
        ? ` | 요청 scope=[${cafe24Scopes().join(",")}] — 개발자센터 앱 권한과 일치시키거나 CAFE24_SCOPES 환경변수로 맞추세요`
        : "";
    return done({
      cafe24: "cafe24-error",
      msg: `${cafeErr}: ${desc}${hint}`.slice(0, 400),
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)cafe24_oauth_state=([^;]+)/)?.[1];

  // 2) 진단 세분화
  if (!code) return done({ cafe24: "no-code", msg: "카페24가 인가 코드를 반환하지 않음 (로그인·동의 미완료 가능)" });
  if (!stateCookie) return done({ cafe24: "no-state-cookie", msg: "state 쿠키 없음 — 쿠키 차단/세션 만료. 같은 브라우저·창에서 다시 시도" });
  if (!state || state !== stateCookie) return done({ cafe24: "state-mismatch", msg: "state 불일치 (CSRF 방지) — 다시 시도" });

  // 3) 코드 교환
  try {
    await exchangeCode(code, `${origin}${CAFE24_REDIRECT_PATH}`);
    return done({ cafe24: "connected" });
  } catch (e) {
    return done({ cafe24: "token-error", msg: e instanceof Error ? e.message : "token exchange 실패" });
  }
}
