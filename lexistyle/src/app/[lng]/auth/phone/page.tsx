import Link from "next/link";
import { LexiMark } from "@/components/lexi-mark";
import { AuthOtpFlow } from "@/components/auth-otp-flow";

export const metadata = { title: "휴대폰 로그인" };

export default function AuthPhonePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <LexiMark size={52} className="text-dim" />
        <p className="font-display text-[28px] font-semibold tracking-tight">
          가락<span className="text-coral">.</span>
        </p>
      </div>
      <AuthOtpFlow />
      <Link href="/auth/sign-in" className="mt-5 text-[13px] font-semibold text-dim hover:text-ink">
        ← 다른 방법으로 로그인
      </Link>
    </div>
  );
}
