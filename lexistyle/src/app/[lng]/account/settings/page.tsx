import Link from "next/link";
import { requireSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "계정 설정" };

export default async function AccountSettingsPage() {
  const session = await requireSession();
  const user = session?.user;

  if (!user?.email) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold">계정 설정</h1>
        <p className="mt-4 text-[14px] text-dim">
          <Link href="/auth/sign-in" className="font-bold text-coral">
            로그인
          </Link>
          이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/account" className="text-[12px] font-semibold text-dim hover:text-ink">
        ← My LEXI
      </Link>
      <h1 className="mt-2 font-display text-[28px] font-semibold">계정 설정</h1>

      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line">
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-[12px] font-bold text-dim">이름</dt>
          <dd className="text-[14px] font-semibold">{user.name || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-[12px] font-bold text-dim">이메일</dt>
          <dd className="text-[14px] font-semibold">{user.email}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/auth/phone"
          className="rounded-xl border border-line px-4 py-2.5 text-[13px] font-semibold hover:bg-fog"
        >
          휴대폰 로그인 연결
        </Link>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-white"
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
