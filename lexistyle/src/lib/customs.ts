/** 개인통관고유부호 — 한국 배송지(KR) 역직구/직구 통관용 */

/** P + 숫자 12자리 (예: P123456789012) */
export const CUSTOMS_CODE_RE = /^P\d{12}$/i;

export function needsCustomsCode(country: string): boolean {
  return country.toUpperCase() === "KR";
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
