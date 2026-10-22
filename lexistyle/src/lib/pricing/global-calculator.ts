/**
 * LEXI Global Pricing Engine — 국가별·채널별 세금 자동 계산
 * docs/global-pricing-engine.md §5
 *
 * DDP 기본 전략: 모든 판매가에 관부세 포함 → 구매자 추가 비용 없음
 * Marketplace Facilitator 채널(Amazon AU, Shopee)은 판매가에서 제외
 */

/* ============================================================
 * 타입 정의
 * ============================================================ */

/** 각국 환율 (USD 대비, 일간 업데이트) */
export interface FxRates {
  USD: number;
  KRW: number;
  AUD: number;
  SGD: number;
  MYR: number;
  IDR: number;
}

/** 국가 코드 */
export type TaxJurisdiction = "KR" | "AU" | "SG" | "MY" | "ID" | "US";

/** HS Code 카테고리 (categoryPath 기반 추정) */
export type HsCategory =
  | "apparel"      // 61–63: 의류·섬유 (관세 8–13%)
  | "cosmetics"    // 33: 화장품·스킨케어 (관세 6.5–12%)
  | "electronics"  // 85: 전자기기 (관세 0–8%)
  | "plastics"     // 39: 플라스틱 잡화 (관세 5–10%)
  | "shoes"        // 64: 신발 (관세 8–15%)
  | "bags"         // 62: 가방 (관세 8–12%)
  | "toys"         // 95: 장난감·키즈 (관세 5–10%)
  | "home"         // 73+: 홈잡화 (관세 5–8%)
  | "default";     // 기본 (관세 8%)

/** 가격 산정 입력 */
export interface PriceInput {
  productCostUsd: number;
  shippingCostUsd: number;
  targetCountry: TaxJurisdiction;
  channelCode: string;
  hsCategory?: HsCategory;
  marginRate?: number;
  platformFeeRate?: number;
}

/** 세금 세목 (breakdown) */
export interface DutyBreakdown {
  tariff: number;    // 관세 USD
  vatOrGst: number;  // 부가세·GST·SST USD
  incomeTax: number; // 소득세 (ID 전용) USD
}

/** 가격 산정 출력 */
export interface PriceOutput {
  cifUsd: number;
  importTaxUsd: number;
  totalCostUsd: number;
  finalPriceUsd: number;
  localPrice: number;
  currency: string;
  fxRateUsed: number;
  dutyBreakdown: DutyBreakdown;
  channelCode: string;
  jurisdiction: TaxJurisdiction;
}

/* ============================================================
 * 상수 — 환율 버퍼, De Minimis, 카테고리별 관세율
 * ============================================================ */

/** 환율 변동 버퍼 — API rate 에 곱해서 역마진 방어 */
const FX_BUFFER = 1.025;

/** 국가별 De Minimis (면세한도) USD 기준 */
const DE_MINIMIS_USD: Record<TaxJurisdiction, number> = {
  KR: 150,
  AU: 650,   // 1,000 AUD → ≈$650
  SG: 300,   // 400 SGD → ≈$300
  MY: 106,   // 500 MYR → ≈$106
  ID: 3,
  US: 800,
};

/** HS Code 카테고리별 기본 관세율 */
const HS_DUTY_RATES: Record<HsCategory, number> = {
  apparel:     0.10,
  cosmetics:   0.09,
  electronics: 0.04,
  plastics:    0.07,
  shoes:       0.12,
  bags:        0.10,
  toys:        0.07,
  home:        0.06,
  default:     0.08,
};

/* ============================================================
 * 채널별 기본 파라미터
 * ============================================================ */

interface ChannelDefault {
  marginRate: number;
  feeRate: number;
  jurisdiction: TaxJurisdiction;
  /** Platform auto-collects tax — don't embed in sell price */
  platformFacilitator: boolean;
}

const CHANNEL_DEFAULTS: Record<string, ChannelDefault> = {
  coupang:    { marginRate: 0.25, feeRate: 0.11, jurisdiction: "KR", platformFacilitator: false },
  shopify:    { marginRate: 0.30, feeRate: 0.02, jurisdiction: "US", platformFacilitator: false },
  amazon_au:  { marginRate: 0.20, feeRate: 0.15, jurisdiction: "AU", platformFacilitator: true },
  // Shopee 는 대상국가에 따라 SG/MY/ID 분기 — channelCode 만으로는 알 수 없음
  shopee:     { marginRate: 0.25, feeRate: 0.05, jurisdiction: "SG", platformFacilitator: true },
  cafe24:     { marginRate: 0.30, feeRate: 0.00, jurisdiction: "KR", platformFacilitator: false },
  lexi:       { marginRate: 0.30, feeRate: 0.00, jurisdiction: "KR", platformFacilitator: false },
};

/* ============================================================
 * HS Code 카테고리 추론 — categoryPath 기반
 * ============================================================ */

/** CJ categoryPath → HsCategory 자동 매핑 */
export function guessHsCategory(categoryPath: readonly string[] | undefined | null): HsCategory {
  if (!categoryPath?.length) return "default";
  const joined = categoryPath.join(" ").toLowerCase();

  if (/cloth|apparel|dress|shirt|pants|jean|jacket|coat|sweater|hoodie|blouse|skirt|suit|tee|t-shirt|tank|crop|cardigan/i.test(joined)) return "apparel";
  if (/makeup|cosmetic|skincare|lipstick|foundation|mascara|eyeshadow|serum|moisturizer|cushion|cleanser|sunscreen|toner/i.test(joined)) return "cosmetics";
  if (/shoe|sneaker|boot|heel|sandal|slipper/i.test(joined)) return "shoes";
  if (/bag|backpack|purse|wallet|clutch|tote|handbag/i.test(joined)) return "bags";
  if (/electronic|phone|usb|charger|cable|adapter|earphone|headphone|speaker|watch.*(smart|digital)/i.test(joined)) return "electronics";
  if (/toy|doll|lego|stuffed|plush|building.block|kid.*game/i.test(joined)) return "toys";
  if (/plastic|acrylic|resin/i.test(joined)) return "plastics";
  if (/home|kitchen|decor|garden|bath|towel|bedding|pillow|curtain|rug|furniture|storage|organizer/i.test(joined)) return "home";

  return "default";
}

/* ============================================================
 * 국가별 관부가세 계산 (DDP)
 * ============================================================ */

export function calculateImportTax(
  cifUsd: number,
  jurisdiction: TaxJurisdiction,
  hsCategory: HsCategory = "default",
): { tariff: number; vatOrGst: number; incomeTax: number } {
  const deMinimis = DE_MINIMIS_USD[jurisdiction];
  const dutyRate = HS_DUTY_RATES[hsCategory];

  switch (jurisdiction) {
    // ── 한국 ──
    case "KR": {
      if (cifUsd <= deMinimis) return { tariff: 0, vatOrGst: 0, incomeTax: 0 };
      const tariff = cifUsd * dutyRate;
      const vat = (cifUsd + tariff) * 0.10;
      return { tariff, vatOrGst: vat, incomeTax: 0 };
    }

    // ── 호주 ──
    case "AU": {
      const audPerUsd = 1.52; // fallback — real via fx-rates
      const cifAud = cifUsd * audPerUsd;
      if (cifAud <= 1000) {
        return { tariff: 0, vatOrGst: cifUsd * 0.10, incomeTax: 0 };
      }
      const tariff = cifUsd * 0.05;
      const gst = (cifUsd + tariff) * 0.10;
      return { tariff, vatOrGst: gst, incomeTax: 0 };
    }

    // ── 싱가포르 ──
    case "SG": {
      const sgdPerUsd = 1.35;
      const cifSgd = cifUsd * sgdPerUsd;
      if (cifSgd <= 400) {
        return { tariff: 0, vatOrGst: cifUsd * 0.09, incomeTax: 0 };
      }
      const tariff = cifUsd * dutyRate;
      const gst = (cifUsd + tariff) * 0.09;
      return { tariff, vatOrGst: gst, incomeTax: 0 };
    }

    // ── 말레이시아 ──
    case "MY": {
      const myrPerUsd = 4.72;
      const cifMyr = cifUsd * myrPerUsd;
      if (cifMyr <= 500) {
        return { tariff: 0, vatOrGst: cifUsd * 0.10, incomeTax: 0 };
      }
      const tariff = cifUsd * dutyRate;
      const lvgt = (cifUsd + tariff) * 0.10;
      return { tariff, vatOrGst: lvgt, incomeTax: 0 };
    }

    // ── 인도네시아 ──
    case "ID": {
      if (cifUsd <= deMinimis) {
        return { tariff: 0, vatOrGst: cifUsd * 0.11, incomeTax: 0 };
      }
      const tariff = cifUsd * dutyRate;
      const vat = cifUsd * 0.11;
      const income = cifUsd * 0.085;
      return { tariff, vatOrGst: vat, incomeTax: income };
    }

    // ── 미국 (Shopify 기본) ──
    case "US":
    default: {
      if (cifUsd <= deMinimis) return { tariff: 0, vatOrGst: 0, incomeTax: 0 };
      const tariff = cifUsd * dutyRate;
      return { tariff, vatOrGst: 0, incomeTax: 0 };
    }
  }
}

/* ============================================================
 * 통화별 라운딩
 * ============================================================ */

const CURRENCY_MAP: Record<TaxJurisdiction, string> = {
  KR: "KRW",
  AU: "AUD",
  SG: "SGD",
  MY: "MYR",
  ID: "IDR",
  US: "USD",
};

/** 통화별 반올림 규칙 */
export function roundUpPrice(price: number, currency: string): number {
  switch (currency) {
    case "KRW": return Math.ceil(price / 100) * 100;
    case "IDR": return Math.ceil(price / 1000) * 1000;
    case "JPY": return Math.ceil(price);
    case "AUD":
    case "SGD":
    case "MYR":
    case "USD":
    default:   return Math.ceil(price * 100) / 100;
  }
}

/* ============================================================
 * 메인 계산 함수
 * ============================================================ */

/**
 * 가격 계산 — CJ 상품 정보와 채널 정보를 입력받아 국가별 세율·마켓수수료·마진율을 반영한 최종 판매가를 산출한다.
 *
 * @param productCostUsd CJ 공급사 원가 (USD)
 * @param shippingCostUsd CJ 배송비 추정 (USD)
 * @param targetCountry 대상 국가 (KR/AU/SG/MY/ID)
 * @param channelCode 채널 코드 (coupang/shopify/amazon_au/shopee/cafe24/lexi)
 * @param marginRate 목표 마진율 (default: 채널별 기본값)
 * @param platformFeeRate 플랫폼 수수료율 (default: 채널별 기본값)
 *
 * @returns 최종 로컬 가격 + 세금 breakdown
 */
export function computeGlobalPrice(
  input: PriceInput,
  fxRates?: FxRates,
): PriceOutput {
  const {
    productCostUsd,
    shippingCostUsd,
    targetCountry,
    channelCode,
    hsCategory = "default",
  } = input;

  // Step 1: CIF
  const cifUsd = productCostUsd + shippingCostUsd;

  // Step 2: 국가별 import tax
  const dutyBreakdown = calculateImportTax(cifUsd, targetCountry, hsCategory);
  const importTaxUsd = dutyBreakdown.tariff + dutyBreakdown.vatOrGst + dutyBreakdown.incomeTax;

  // Step 3: 총원가
  const totalCostUsd = cifUsd + importTaxUsd;

  // Step 4: 채널별 기본 파라미터
  const defaults = CHANNEL_DEFAULTS[channelCode];
  if (!defaults) throw new Error(`Unknown channel: ${channelCode}`);

  const effectiveMargin = input.marginRate ?? defaults.marginRate;
  const effectiveFee = input.platformFeeRate ?? defaults.feeRate;
  const denominator = 1.0 - effectiveMargin - effectiveFee;
  if (denominator <= 0) {
    throw new Error(
      `marginRate (${effectiveMargin}) + platformFeeRate (${effectiveFee}) >= 1.0 — 채널 ${channelCode}`,
    );
  }

  // Step 5: 판매가 (USD)
  const finalPriceUsd = totalCostUsd / denominator;

  // Step 6: 현지 통화 환산
  const currency = CURRENCY_MAP[targetCountry] ?? "USD";
  const fallbackFx: Record<string, number> = {
    USD: 1, KRW: 1350, AUD: 1.52, SGD: 1.35, MYR: 4.72, IDR: 15800,
  };
  const rawRate = fxRates ? (fxRates as unknown as Record<string, number>)[currency] : fallbackFx[currency];
  const rate = (rawRate ?? 1) * FX_BUFFER;
  const localPriceRaw = finalPriceUsd * rate;
  const localPrice = roundUpPrice(localPriceRaw, currency);

  // 정밀 라운딩
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const r6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

  return {
    cifUsd: r2(cifUsd),
    importTaxUsd: r2(importTaxUsd),
    totalCostUsd: r2(totalCostUsd),
    finalPriceUsd: r2(finalPriceUsd),
    localPrice,
    currency,
    fxRateUsed: r6(rate),
    dutyBreakdown: {
      tariff: r2(dutyBreakdown.tariff),
      vatOrGst: r2(dutyBreakdown.vatOrGst),
      incomeTax: r2(dutyBreakdown.incomeTax),
    },
    channelCode,
    jurisdiction: targetCountry,
  };
}

/** 채널 코드 → 대상 국가 판정 */
export function jurisdictionForChannel(channelCode: string): TaxJurisdiction {
  const d = CHANNEL_DEFAULTS[channelCode];
  return d?.jurisdiction ?? "US";
}

/** 채널이 플랫폼 자동 세금징수(Facilitator)를 하는지 여부 */
export function isPlatformFacilitator(channelCode: string): boolean {
  return CHANNEL_DEFAULTS[channelCode]?.platformFacilitator ?? false;
}