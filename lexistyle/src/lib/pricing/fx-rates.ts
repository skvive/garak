/**
 * 환율 서비스 — API 연동 + DB 캐시 + 변동 버퍼
 * docs/global-pricing-engine.md §8
 */

import { db, hasDb } from "@/db";
import { fxRates } from "@/db/schema";
import { eq, desc, or, isNull, sql } from "drizzle-orm";

const FX_API = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const FX_BUFFER = 1.025;

export interface FxRateSnapshot {
  rate: number;
  buffered: number;
  source: "api" | "cache" | "fallback";
}

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  KRW: 1350,
  AUD: 1.52,
  SGD: 1.35,
  MYR: 4.72,
  IDR: 15800,
  JPY: 149,
};

/** 단일 통화 환율 조회 (1 USD → target currency) */
export async function getFxRate(targetCurrency: string): Promise<FxRateSnapshot> {
  if (!hasDb()) return fallback(targetCurrency);

  try {
    // 1. 캐시 조회
    const [cached] = await db()
      .select()
      .from(fxRates)
      .where(eq(fxRates.currency, targetCurrency))
      .orderBy(desc(fxRates.updatedAt))
      .limit(1);

    const now = Date.now();
    if (cached) {
      const cachedAt = new Date(cached.updatedAt).getTime();
      if (now - cachedAt < CACHE_TTL_MS) {
        const rate = Number(cached.usdPerUnit);
        return { rate, buffered: invertForPrice(rate, targetCurrency), source: "cache" };
      }
    }

    // 2. API 호출
    const res = await fetch(FX_API, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.[targetCurrency];
    if (!rate || rate <= 0) throw new Error(`FX API missing rate for ${targetCurrency}`);

    // 3. 저장
    const inverted = 1 / rate; // USD per unit
    await db()
      .insert(fxRates)
      .values({ currency: targetCurrency, usdPerUnit: String(inverted) })
      .onConflictDoUpdate({
        target: [fxRates.currency],
        set: { usdPerUnit: String(inverted), updatedAt: new Date() },
      });

    return { rate, buffered: rate * FX_BUFFER, source: "api" };
  } catch {
    return fallback(targetCurrency);
  }
}

/** 모든 대상 통화 일괄 갱신 */
export async function refreshAllFxRates(): Promise<Record<string, FxRateSnapshot>> {
  const targets = ["KRW", "AUD", "SGD", "MYR", "IDR", "JPY"];
  const results: Record<string, FxRateSnapshot> = {};

  for (const t of targets) {
    results[t] = await getFxRate(t);
  }

  return results;
}

/** 가격 변환용 환율 (USD 가격 → 현지통화) — 버퍼 포함 */
function invertForPrice(rate: number, _currency: string): number {
  return rate * FX_BUFFER;
}

function fallback(targetCurrency: string): FxRateSnapshot {
  const rate = FALLBACK_RATES[targetCurrency] ?? 1;
  return { rate, buffered: rate * FX_BUFFER, source: "fallback" };
}