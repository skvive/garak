/** 개인통관고유부호 — 가락한상은 국내 직배송 몰이므로 통관부호 불필요 (역직구 잔재 제거) */
export const CUSTOMS_CODE_RE = /^P\d{12}$/i;

export function needsCustomsCode(country: string): boolean {
  return false;
}

export function normalizeCustomsCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function validateCustomsCode(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return "개인통관고유부호를 입력해 주세요";
  const code = normalizeCustomsCode(raw);
  if (!CUSTOMS_CODE_RE.test(code)) {
    return "형식: P + 숫자 12자리 (예: P123456789012)";
  }
  return null;
}
