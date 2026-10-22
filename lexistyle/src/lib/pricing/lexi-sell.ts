/**
 * LEXI 판매가 공식 — 정본은 `src/lib/hq/types.ts` `computeSellPrice`.
 * @deprecated 직접 호출 대신 `computeSellPrice` 사용 권장.
 */
import { computeSellPrice, MARKUP_RATE, SOURCING_FEE } from "@/lib/hq/types";

export const LEXI_FULFILLMENT_USD = SOURCING_FEE;
export const LEXI_MARKUP = MARKUP_RATE;

/** CJ 공장가(USD) → LEXI 판매가(USD), x.9 프라이싱 */
export function computeLexiSellUsd(cjFactoryUsd: number): number {
  return computeSellPrice(cjFactoryUsd);
}
