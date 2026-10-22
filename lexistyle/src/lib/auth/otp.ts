/**
 * 휴대폰 OTP — 시각·플로우 MVP.
 * SMS 프로바이더 미연동 시 고정 코드(000000)로 검증 후 세션 발급.
 * 실연동 시 OTP_SMS_PROVIDER + 키로 교체.
 */

type Challenge = {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
};

const g = globalThis as unknown as { __lexiOtp?: Map<string, Challenge> };
function store(): Map<string, Challenge> {
  if (!g.__lexiOtp) g.__lexiOtp = new Map();
  return g.__lexiOtp;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

export function validatePhone(raw: string): string | null {
  const phone = normalizePhone(raw);
  if (!/^01[016789]\d{7,8}$/.test(phone)) {
    return "올바른 휴대폰 번호를 입력해 주세요 (예: 01012345678)";
  }
  return null;
}

export function createOtpChallenge(phoneRaw: string): {
  phone: string;
  expiresInSec: number;
  demoCode?: string;
} {
  const err = validatePhone(phoneRaw);
  if (err) throw new Error(err);
  const phone = normalizePhone(phoneRaw);
  const demoMode = process.env.OTP_MOCK !== "0";
  const code = demoMode
    ? "000000"
    : String(Math.floor(100000 + Math.random() * 900000));
  const expiresInSec = 120;
  store().set(phone, {
    phone,
    code,
    expiresAt: Date.now() + expiresInSec * 1000,
    attempts: 0,
  });
  // TODO: SMS 발송 (Solapi/Twilio). 현재는 콘솔 + UI 힌트.
  if (demoMode) console.info(`[otp] mock code for ${phone}: ${code}`);
  return { phone, expiresInSec, demoCode: demoMode ? code : undefined };
}

export function verifyOtp(phoneRaw: string, codeRaw: string): { phone: string; email: string } {
  const phone = normalizePhone(phoneRaw);
  const ch = store().get(phone);
  if (!ch) throw new Error("인증번호를 먼저 요청해 주세요");
  if (Date.now() > ch.expiresAt) {
    store().delete(phone);
    throw new Error("인증번호가 만료되었습니다. 다시 요청해 주세요");
  }
  ch.attempts += 1;
  if (ch.attempts > 5) {
    store().delete(phone);
    throw new Error("시도 횟수를 초과했습니다");
  }
  if (ch.code !== codeRaw.trim()) throw new Error("인증번호가 올바르지 않습니다");
  store().delete(phone);
  // 세션용 가상 이메일 (휴대폰 로그인 식별자)
  const email = `phone_${phone}@lexi.otp`;
  return { phone, email };
}
