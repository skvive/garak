import { LexiMark } from "@/components/lexi-mark";
import { authConfigured } from "@/lib/auth/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ path: "sign-in" }, { path: "sign-out" }];
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { path } = await params;
  const { next: nextParam } = await searchParams;
  const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID);
  const demoReady = process.env.DEMO_LOGIN === "1";
  const isSignIn = path === "sign-in";
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/hq";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <LexiMark size={52} className="text-dim" />
        <p className="font-display text-[28px] font-semibold tracking-tight">
          LEXI<span className="text-coral">.</span>
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6">
        <h1 className="text-[20px] font-bold">로그인</h1>
        <p className="mt-1 text-[13px] text-dim">계정으로 로그인하고 쇼핑몰을 이용하세요</p>
        <p className="mt-2 text-[11px] text-dim">
          아직 계정이 없으신가요?{' '}
          <a href="sign-up" className="font-semibold text-ink underline underline-offset-2">회원가입</a>
        </p>
        {googleReady ? (
          <a
            href="/api/auth/google"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-[14px] font-semibold transition-colors hover:bg-fog"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Google로 로그인
          </a>
        ) : (
          <p className="mt-5 rounded-lg bg-fog p-3 text-[12px] text-dim">
            GOOGLE_CLIENT_ID 미설정 — Google 로그인을 사용하려면 환경변수를 등록하세요.
          </p>
        )}
        {isSignIn && (
          <a
            href="/auth/phone"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-ink px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            휴대폰번호로 로그인
          </a>
        )}
      </div>

      {demoReady && isSignIn && (
        <form method="post" action="/api/auth/demo" className="mt-5 w-full max-w-sm">
          <input type="hidden" name="next" value={nextPath} />
          <button
            type="submit"
            className="w-full rounded-xl border border-line bg-fog px-4 py-3 text-[14px] font-semibold transition-colors hover:bg-ink hover:text-white"
          >
            🔓 데모 로그인 — 관리자 콘솔 체험
          </button>
          <p className="mt-2 text-center text-[11px] text-dim">
            로그인 없이 둘러보기 · 24시간 세션
          </p>
        </form>
      )}
    </div>
  );
}