/**
 * 표기 포맷 — 가락한상: 원장·노출 모두 KRW(원).
 * 역직구(USD 원장 + KRW 노출) 구조를 제거하고 원화 네이티브로 전환.
 * docs: 가락한상 쇼핑몰 전환 기획서 §7
 */

/** 클라이언트에서도 쓰이므로 NEXT_PUBLIC 우선, 없으면 서버 env, 최후 기본값 */
export const USD_KRW =
  Number(process.env.NEXT_PUBLIC_USD_KRW_RATE) ||
  Number(process.env.USD_KRW_RATE) ||
  1; // 가락한상: 원장 KRW(원)

export const usdToKrw = (usd: number) => Math.round((usd * USD_KRW) / 10) * 10;

const krwFmt = new Intl.NumberFormat("ko-KR");
const usdFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 12,900원 */
export const krw = (won: number) => `${krwFmt.format(Math.round(won))}원`;
/** $9.55 */
export const usd = (dollars: number) => `$${usdFmt.format(dollars)}`;

/** KRW 원장값 → 한국어 표기 { primary: "35,000원", secondary: null } */
export function priceLabels(krwAmount: number) {
  const won = Math.round(krwAmount);
  if (USD_KRW === 1) return { primary: krw(won), secondary: null };
  return { primary: krw(usdToKrw(krwAmount)), secondary: usd(krwAmount) };
}

/** 할인 전 가격 역산 (판매가와 할인율로부터) */
export function listPriceFrom(sellUsd: number, discountRate: number) {
  if (!discountRate || discountRate <= 0) return null;
  return sellUsd / (1 - discountRate / 100);
}

/** 단위가격 병기: "(100g당 1,234원)" */
export function unitPriceLabel(totalWon: number, amount: number, unit: string, per = 100) {
  if (!amount || amount <= 0) return null;
  return `(${unit === "개" ? "1개당" : `${per}${unit}당`} ${krw((totalWon / amount) * (unit === "개" ? 1 : per))})`;
}

/** ms → "15:18:30" / "22:45:48" (초 단위 카운트다운) */
export function countdownLabel(msLeft: number) {
  if (msLeft <= 0) return "00:00:00";
  const s = Math.floor(msLeft / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}
