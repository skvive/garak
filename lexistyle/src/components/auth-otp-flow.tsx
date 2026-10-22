"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code";

export function AuthOtpFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [demoHint, setDemoHint] = useState<string | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  async function sendCode() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발송 실패");
      setStep("code");
      setSeconds(data.expiresInSec ?? 120);
      setDemoHint(data.demoCode ? `테스트 코드: ${data.demoCode}` : null);
      setCode("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function verify() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "인증 실패");
      router.push(data.redirectUrl || "/account");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6">
      <h1 className="text-[20px] font-bold">휴대폰 로그인</h1>
      <p className="mt-1 text-[13px] text-dim">
        {step === "phone"
          ? "휴대폰 번호로 인증번호를 받습니다"
          : "문자로 받은 6자리 인증번호를 입력하세요"}
      </p>

      {step === "phone" ? (
        <label className="mt-5 block text-[12px] font-medium text-dim">
          휴대폰 번호
          <input
            type="tel"
            inputMode="numeric"
            placeholder="01012345678"
            className="mt-1 w-full rounded-lg border border-line px-3 py-3 text-[16px] tracking-wide text-ink"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
        </label>
      ) : (
        <>
          <p className="mt-4 text-[13px] font-semibold text-ink">
            {phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3")}
            <button
              type="button"
              className="ml-2 text-[12px] font-medium text-coral"
              onClick={() => {
                setStep("phone");
                setError("");
              }}
            >
              변경
            </button>
          </p>
          <label className="mt-3 block text-[12px] font-medium text-dim">
            인증번호
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="mt-1 w-full rounded-lg border border-line px-3 py-3 text-center font-mono text-[22px] tracking-[0.35em] text-ink"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
          </label>
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className={`font-semibold ${seconds > 0 ? "text-coral" : "text-dim"}`}>
              {seconds > 0 ? `${mm}:${ss}` : "만료됨"}
            </span>
            <button
              type="button"
              disabled={pending || seconds > 90}
              onClick={sendCode}
              className="font-semibold text-ink underline-offset-2 hover:underline disabled:opacity-40"
            >
              재발송
            </button>
          </div>
          {demoHint && (
            <p className="mt-2 rounded-lg bg-fog px-3 py-2 text-[11px] text-dim">{demoHint}</p>
          )}
        </>
      )}

      {error && <p className="mt-3 text-[13px] text-coral">{error}</p>}

      <button
        type="button"
        disabled={pending || (step === "phone" ? phone.length < 10 : code.length < 6)}
        onClick={step === "phone" ? sendCode : verify}
        className="mt-5 w-full rounded-xl bg-ink py-3.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending
          ? "처리 중…"
          : step === "phone"
            ? "인증번호 받기"
            : "로그인"}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-dim">
        SMS 미연동 환경에서는 테스트 코드로 로그인됩니다.
        <br />
        비밀번호로 로그인하려면 Google 계정을 이용해 주세요.
      </p>
    </div>
  );
}
