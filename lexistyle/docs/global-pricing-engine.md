# LEXI Global Pricing Engine — 국가별 세금 자동 계산 파이프라인

**버전:** 1.0  
**작성일:** 2026-09-03  
**상태:** 기획·설계  

---

## 1. 개요 및 목표

현재 `computeSellPrice()` 는 모든 Export 채널(LEXI, Coupang, Shopify, Amazon AU, Shopee 등)에 **단일 공식** `(원가 + $20) × 1.3` 을 동일 적용한다. 다국적 판매처의 각국 De Minimis 법규(DSU), VAT/GST/SST, 플랫폼 자동징수 규칙을 고려하지 못해:

- 한국 쿠팡 판매 시 CIF $150 초과 제품 관세/부가세 누락
- 호주 Amazon AU Marketplace Facilitator와 중복 과세 가능성
- 인도네시아 CIF $3 이하 규정을 무시한 가격 책정
- 환율 변동으로 인한 역마진 발생
- 각국 현지 통화에 맞지 않는 라운딩

위 문제들을 해결하기 위해 **국가별·채널별 세금 자동 계산 엔진**을 구축한다.

### 핵심 목표

1. **DDP 기본 전략**: 모든 판매가에 관부세 포함 → 구매자 추가 비용 없음 → 전환율 향상
2. **채널별 최적 가격**: 각 마켓 API/법규에 맞춘 정확한 리스팅가 산출
3. **환율 리스크 관리**: 실시간 환율 + 변동 버퍼(+2~3%)로 역마진 차단
4. **HS Code 기반 정밀 관세**: 품목별 관세율 매핑으로 과소/과대 계산 방지
5. **Marketplace Facilitator 중복 방지**: Amazon/Shopee 자동징수 마켓은 재판매가에 세금 미포함

---

## 2. 현재 아키텍처 분석

```
CJ Dropshipping API
       │
       ▼
catalog_index (최저 원가 min_price)
       │
       ▼
computeSellPrice(costUsd) ──────► 단일 USD판매가
       │                             │
       ├── Import → products.price_usd   │
       ├── Export jobs                     │
       │   enqueueExport(pricing.sellPriceUsd)  │
       │                                    ▼
       ├── projectForShopify()              채널별 리스팅
       ├── projectForCoupang()
       ├── projectForAmazonAu()
       └── projectForShopee()
```

### 문제점

| 항목 | 현재 상태 | 영향 |
|------|----------|------|
| 세금 계산 | 전무 | CIF 초과 시 하위 마진 / 과다 가격 |
| 환율 | 하드코드된 정적 DEFAULT_FX (불완전) | outdated rate → 역마진 |
| 채널별 가격 | 단일 `price_usd` 칼럼 | 쿠팡/아마존/쇼피 다른 통화/관세 무시 |
| HS Code | CJ product 정보에 없음 (API 지원 확인 필요) | 관세율 추정만 가능 |
| Marketplace Facilitator | 미검토 | Amazon/AU 이중과세 가능성 |
| 수수료율 | Channel config `feeRate` 존재 but 사용 안 함 | 실제 마진 계산 불일치 |

---

## 3. 국가별 관부세 구조 상세 테이블

### 3.1 De Minimis Thresholds

| 국가 | 채널/마켓 | De Minimis (CIF*) | 초과 시 세율 | 플랫폼 자동징수 | 비고 |
|------|----------|--------------------|-------------|----------------|------|
| **한국 (KR)** | Coupang | $150 USD | 관세 ~8% + 부가가치세 10% | ❌ (판매자 DDP 설정 또는 구매자 납부) | 미국발 발송 시 $200 |
| **미국 (US)** | Shopify US | $800 USD | HS Code별 관세 + 주별 Sales Tax | ✅ (플랫폼마다 상이) | CIF = 상품가+보험+배송 |
| **호주 (AU)** | Amazon AU | 1,000 AUD (~$650 USD) | ≤$650: GST 10% \| >$650: Duty 5%+GST 10% | ✅ (Marketplace Facilitator) | 소액물품(GST Act 2000) |
| **싱가포르 (SG)** | Shopee SG | 400 SGD (~$300 USD) | ≤$300: LVG GST 9% \| >$300: Duty+GST 9% | ✅ (LVG GST Act) | Low Value Goods 규정 |
| **말레이시아 (MY)** | Shopee MY | 500 MYR (~$106 USD) | ≤$106: LVG Tax 10% \| >$106: Duty+LMST 10% | ✅ (LVGT) | Low Value Goods Tax |
| **인도네시아 (ID)** | Shopee ID | $3 USD (사실상 없음) | Duty + PPN 11% + PPh 7.5~10% | ✅ (SLS 통관 연동) | 매우 낮은 면세한도 |

**CIF 정의:** `CIF = Product Cost + Shipping Cost + Insurance`  
*(본 시스템에서 Insurance는 ShippingCost에 통합됨)*

### 3.2 관세율 추정보 (HS Code 기준)

| HS Code 범주 | 품목 예시 | 표준 관세율 | 적용 국가 |
|-------------|----------|------------|----------|
| 61~63 | 의류(knit/woven), 텍스타일 | 8~13% | KR, AU, SG, MY, ID |
| 33 | 화장품, 스킨케어, 메이크업 | 6.5~12% | KR, AU, SG, MY |
| 85 | 전자제품, 가젯 | 0~8% | KR, AU, SG, MY, ID |
| 39 | 플라스틱잡화 | 5~10% | KR, AU, SG, MY, ID |
| 64 | 신발( 가죽 합성 ) | 8~15% | KR, AU, SG, MY |
| 62 | 가방 (천/가죽) | 8~12% | KR, AU, SG, MY, ID |
| 95 | 장난감, 키즈용품 | 5~10% | KR, AU, SG, MY, ID |
| 73 | 철강홈잡화 | 5~8% | KR, AU, SG, MY, ID |

> **전략:** CJ API에서 HS Code를 직접 받을 수 없으면 `categoryPath` 기반 rough estimation 사용. 가능하면 `supplierProduct.hs_code` 필드로 확장.

---

## 4. 가격 산정 프로세스 설계

### 4.1 전체 Pipeline

```
┌────────────────────────────────────────────────────────────┐
│  STEP 1: CJ Dropshipping API 호출                          │
│  input: productId                                            │
│  output: productCostUsd, shippingCostUsd, originCountry    │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 2: 환율 조회 + 버퍼 적용                               │
│  - 실시간 API (ex: exchangerate-api.com)                   │
│  - buffer: +2.5% volatility reserve                        │
│  output: fxRates[key] = cachedRate * 1.025                │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 3: CIF 계산                                             │
│  cifUsd = productCostUsd + shippingCostUsd                 │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 4: 국가별 importTax 계산 (DDP 모드)                    │
│  calculateImportTax(cifUsd, targetCountry, hsCode?)        │
│  output: importTaxUsd                                       │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 5: 총원가 + 마진 + 수수료 최종가격                      │
│  totalCostUsd = cifUsd + importTaxUsd                      │
│  finalPriceUsd = totalCostUsd / (1 - marginRate - feeRate)│
│  localPrice = finalPriceUsd * fxRate(targetCurrency)       │
│  roundedPrice = applyRounding(localPrice, currency)        │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  STEP 6: 채널별 리스팅 등록                                  │
│  channels: coupang | shopify | amazon_au | shopee | cafe24 │
│  output: listingId per channel                              │
└────────────────────────────────────────────────────────────┘
```

### 4.2 수식 정리

```
CIF           = costUsd + shippingUsd
importTax     = calcByCountry(CIF, country, hsCode?)
totalCost     = CIF + importTax
finalPriceUsd = totalCost / (1 - marginRate - platformFeeRate)
localPrice    = finalPriceUsd * fxRate(currency)
listingPrice  = roundUp(localPrice, currency)
```

### 4.3 채널별 파라미터 사전

| 채널 코드 | 대상국가 | 통화 |_MARGIN RATE | PLATFORM FEE | 관세계산 여부 | Facilitator? |
|-----------|---------|------|------------|-------------|-------------|-------------|
| `coupang` | KR | KRW | 0.25 | 0.11 (쿠팡 수수료) | YES ($150 초과 시) | ❌ |
| `shopify` | multi | USD/EUR/GBP | 0.30 | 0.02 (Stripe) | HS (country별) | 일부 |
| `amazon_au` | AU | AUD | 0.20 | 0.15 (referral) | YES (<1000AUD:GST만) | ✅ |
| `shopee` | SG/MY/ID | SGD/MYR/IDR | 0.25 | 0.04~0.06 | YES (각국 기준) | ✅ |
| `cafe24` | KR | KRW | 0.30 | 0.00 (자체몰) | YES ($150 초과 시) | ❌ |
| `lexi` | KR | KRW | 0.30 | 0.00 (자체몰) | YES ($150 초과 시) | ❌ |

> **참고:**marginRate/feeRate는 현재 `MARKUP_RATE=1.3`(30%)와 채널별 `config.feeRate`에서 유추. 위 값은 초기 권장안. 실제 조정은 A/B 테스트 결과 반영.

---

## 5. GlobalPriceCalculator 서비스 설계

### 5.1 TypeScript Class 설계

**파일 위치:** `src/lib/pricing/global-calculator.ts`

```typescript
/** 국가별 세금 계산 엔진 */

/** 각국 환율 (USD 대비. 일간 업데이트) */
export interfaceFxRates {
  KRW: number;
  AUD: number;
  SGD: number;
  MYR: number;
  IDR: number;
  USD: number;
}

/** 국가 코드 타입 */
export type TaxJurisdiction = 'KR' | 'AU' | 'SG' | 'MY' | 'ID';

/** HS Code 카테고리 (rough mapping) */
export type HsCategory =
  | 'apparel'      // 61-63: 옷, 섬유 (관세 8-13%)
  | 'cosmetics'    // 33: 화장품 (관세 6.5-12%)
  | 'electronics'  // 85: 전자제품 (관세 0-8%)
  | 'plastics'     // 39: 플라스틱 잡화 (관세 5-10%)
  | 'shoes'        // 64: 신발 (관세 8-15%)
  | 'bags'         // 62: 가방 (관세 8-12%)
  | 'toys'         // 95: 장난감/키즈 (관세 5-10%)
  | 'home'         // 73+: 홈잡화 (관세 5-8%)
  | 'default';     // 기본 (관세 8%)

/** 가격 산정 입력 */
export interface PriceInput {
  productCostUsd: number;
  shippingCostUsd: number;
  originCountry: string;
  targetCountry: TaxJurisdiction;
  /** Channels: coupang, shopify, amazon_au, shopee, cafe24, lexi */
  channelCode: string;
  hsCategory?: HsCategory;
  /** 목표 마진율 (default 0.30) */
  marginRate?: number;
  /** 플랫폼 수수료율 (channel별 default 사용) */
  platformFeeRate?: number;
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
  dutyBreakdown: {
    tariff: number;   // 관세 USD
    vatOrGst: number; // 부가가치세/GST SGD USD
    incomeTax: number;// 소득세 (ID 전용) USD
  };
  channelCode: string;
  jurisdiction: TaxJurisdiction;
}

// --- 핵심 로직 ---

const FX_BUFFER = 1.025; // 2.5% 환율 변동 버퍼

const DE_MINIMIS_USD: Record<TaxJurisdiction, number> = {
  KR: 150,      // $150 USD
  AU: 650,      // ~$650 USD (= 1000 AUD)
  SG: 300,      // ~$300 USD (= 400 SGD)
  MY: 106,      // ~$106 USD (= 500 MYR)
  ID: 3,        // $3 USD (사실상 없음)
};

const DEFAULT_DUTY_RATES: Record<HsCategory, number> = {
  apparel: 0.10,     // 10% 중앙값
  cosmetics: 0.09,   // 9% 중앙값
  electronics: 0.04, // 4% 중앙값
  plastics: 0.07,    // 7% 중앙값
  shoes: 0.12,       // 12% 중앙값
  bags: 0.10,        // 10% 중앙값
  toys: 0.07,        // 7% 중앙값
  home: 0.06,        // 6% 중앙값
  default: 0.08,     // 8% 기본
};

const CHANNEL_DEFAULTS: Record<string, { marginRate: number; feeRate: number; currency: TaxJurisdiction }> = {
  coupang:     { marginRate: 0.25, feeRate: 0.11, currency: 'KR' },
  shopify:     { marginRate: 0.30, feeRate: 0.02, currency: 'US' },  // Shopify는 다중국가 → 별도 지정 필요
  amazon_au:   { marginRate: 0.20, feeRate: 0.15, currency: 'AU' },
  shopee:      { marginRate: 0.25, feeRate: 0.05, currency: 'SG' },  // Shopee도 다중국가 → 별도 지정 필요
  cafe24:      { marginRate: 0.30, feeRate: 0.00, currency: 'KR' },
  lexi:        { marginRate: 0.30, feeRate: 0.00, currency: 'KR' },
};

/** 국가 코드 → TaxJurisdiction 역매핑 */
function jurisdictionForChannel(channelCode: string): TaxJurisdiction {
  switch (channelCode) {
    case 'coupang':
    case 'cafe24':
    case 'lexi': return 'KR';
    case 'amazon_au': return 'AU';
    case 'shopee': return 'SG'; // Default SG shop — real country should be passed explicitly
    case 'shopify': return 'US'; // Shopify是多国 — should use explicit parameter
    default: throw new Error(`Unknown channel: ${channelCode}`);
  }
}

/** 관세 및 부가세 계산 (DDP 모드) */
export function calculateImportTax(
  cifUsd: number,
  jurisdiction: TaxJurisdiction,
  hsCategory: HsCategory = 'default',
): { tariff: number; vatOrGst: number; incomeTax: number } {
  const deMinimis = DE_MINIMIS_USD[jurisdiction];
  const dutyRate = DEFAULT_DUTY_RATES[hsCategory];

  switch (jurisdiction) {
    case 'KR': {
      if (cifUsd <= deMinimis) return { tariff: 0, vatOrGst: 0, incomeTax: 0 };
      const tariff = cifUsd * dutyRate;
      const vat = (cifUsd + tariff) * 0.10; // 부가세 10%
      return { tariff, vatOrGst: vat, incomeTax: 0 };
    }

    case 'AU': {
      const cifAud = cifUsd * 1.52; // hardcoded fallback — will use live FX
      if (cifAud <= 1000) {
        // 소액물품: GST 10%만 (AmazonFacilitator자동징수)
        return { tariff: 0, vatOrGst: cifUsd * 0.10, incomeTax: 0 };
      } else {
        const tariff = cifUsd * 0.05;
        const gst = (cifUsd + tariff) * 0.10;
        return { tariff, vatOrGst: gst, incomeTax: 0 };
      }
    }

    case 'SG': {
      const cifSgd = cifUsd * 1.35; // hardcoded fallback
      if (cifSgd <= 400) {
        // LVG GST 9%
        return { tariff: 0, vatOrGst: cifUsd * 0.09, incomeTax: 0 };
      } else {
        const tariff = cifUsd * dutyRate;
        const gst = (cifUsd + tariff) * 0.09;
        return { tariff, vatOrGst: gst, incomeTax: 0 };
      }
    }

    case 'MY': {
      const cifMyr = cifUsd * 4.72; // hardcoded fallback
      if (cifMyr <= 500) {
        // LVG Tax 10%
        return { tariff: 0, vatOrGst: cifUsd * 0.10, incomeTax: 0 };
      } else {
        const tariff = cifUsd * dutyRate;
        const lvgt = (cifUsd + tariff) * 0.10;
        return { tariff, vatOrGst: lvgt, incomeTax: 0 };
      }
    }

    case 'ID': {
      if (cifUsd <= deMinimis) {
        return { tariff: 0, vatOrGst: cifUsd * 0.11, incomeTax: 0 }; // VAT 11%만
      } else {
        const tariff = cifUsd * dutyRate;
        const vat = cifUsd * 0.11; // PPN 11%
        const income = cifUsd * 0.085; // PPh 평균 7.5-10% → 8.5%
        return { tariff, vatOrGst: vat, incomeTax: income };
      }
    }

    default:
      throw new Error(`Unsupported jurisdiction: ${jurisdiction}`);
  }
}

/** 통화별 라운딩 규칙 */
function roundUpPrice(price: number, currency: string): number {
  switch (currency) {
    case 'KRW': return Math.ceil(price / 100) * 100;   // 100원 단위
    case 'IDR': return Math.ceil(price / 1000) * 1000; // 1000 Rupiah 단위
    case 'JPY': return Math.ceil(price);                // 정수 엔화
    case 'AUD':
    case 'SGD':
    case 'MYR':
    case 'USD':
    default: return Math.ceil(price * 100) / 100;       // 2자리 소수점 올림
  }
}

/** 메인 가격 계산 함수 */
export function computeGlobalPrice(input: PriceInput): PriceOutput {
  const {
    productCostUsd,
    shippingCostUsd,
    targetCountry,
    channelCode,
    hsCategory = 'default',
    marginRate = 0.30,
    platformFeeRate = 0.15,
  } = input;

  // Step 1: CIF
  const cifUsd = productCostUsd + shippingCostUsd;

  // Step 2: 국가별 import tax
  const dutyBreakdown = calculateImportTax(cifUsd, targetCountry, hsCategory);
  const importTaxUsd = dutyBreakdown.tariff + dutyBreakdown.vatOrGst + dutyBreakdown.incomeTax;

  // Step 3: 총원가
  const totalCostUsd = cifUsd + importTaxUsd;

  // Step 4: 채널별 default 추출
  const defaults = CHANNEL_DEFAULTS[channelCode];
  if (!defaults) throw new Error(`No defaults for channel: ${channelCode}`);

  const effectiveMargin = input.marginRate ?? defaults.marginRate;
  const effectiveFee = input.platformFeeRate ?? defaults.feeRate;
  const denominator = 1.0 - effectiveMargin - effectiveFee;
  if (denominator <= 0) {
    throw new Error('marginRate + platformFeeRate must be < 1.0');
  }

  // Step 5: Final USD price
  const finalPriceUsd = totalCostUsd / denominator;

  // Step 6: Local currency conversion
  // NOTE: In production, exchange rates come from the cache/API
  const fxRates: Record<string, number> = {
    USD: 1,
    KRW: 1350,
    AUD: 1.52,
    SGD: 1.35,
    MYR: 4.72,
    IDR: 15800,
  };
  const currencyMap: Record<string, string> = {
    KR: 'KRW', AU: 'AUD', SG: 'SGD', MY: 'MYR', ID: 'IDR', US: 'USD',
  };
  const targetCurrency = currencyMap[targetCountry] ?? 'USD';
  const fxRateRaw = fxRates[targetCurrency] ?? 1;
  const fxRateWithBuffer = fxRateRaw * FX_BUFFER;
  const localPriceRaw = finalPriceUsd * fxRateWithBuffer;
  const localPrice = roundUpPrice(localPriceRaw, targetCurrency);

  return {
    cifUsd: Math.round(cifUsd * 100) / 100,
    importTaxUsd: Math.round(importTaxUsd * 100) / 100,
    totalCostUsd: Math.round(totalCostUsd * 100) / 100,
    finalPriceUsd: Math.round(finalPriceUsd * 100) / 100,
    localPrice,
    currency: targetCurrency,
    fxRateUsed: fxRateWithBuffer,
    dutyBreakdown,
    channelCode,
    jurisdiction: targetCountry,
  };
}
```

---

## 6. Pipeline 통합 지점

### 6.1 기존 vs 신규 Pipeline 비교

**기존:**
```
computeSellPrice(costUsd) → 단일 sellPriceUsd → products.price_usd
```

**신규:**
```
computeGlobalPrice({
  productCostUsd, shippingCostUsd,
  channelCode, targetCountry, hsCategory?,
}) → localPrice, currency
                                │
                                ├──→ channel_price_usd[KR]=localPrice/fx
                                ├──→ channel_price_usd[AU]=localPrice/fx
                                ├──→ ...
                                │
                                └──→ baseSellPriceUsd = max(channel_prices)
                                     → products.price_usd = baseSellPriceUsd
```

### 6.2 통합 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/pricing/global-calculator.ts` | **새로 생성** — `computeGlobalPrice`, `calculateImportTax`, `roundUpPrice` |
| `src/lib/pricing/fx-rates.ts` | **새로 생성** — ExchangeRateCacheTable + fetch/update job |
| `src/lib/hq/types.ts` | 수정 — `computeSellPrice` deprecated, `computeGlobalPrice` export |
| `src/lib/catalog/import.ts` | 수정 — Import 시 `computeGlobalPrice`로 여러 채널 가격 동시 생성 |
| `src/lib/export/jobs.ts` | 수정 — Export 시 채널별 `sellPriceUsd` 전달 |
| `src/db/schema.ts` | 수정 — `products` 테이블에 새 컬럼 추가 |
| `src/lib/catalog/cj-schema.ts` | 선택 — CJ API에서 `hsCode` field 발견 시 mapping |
| `src/lib/sourcing/connectors/cjdropshipping.ts` | 선택 — HS Code 파싱 추가 (API response에 있으면) |

### 6.3 `computeSellPrice`와의 관계

```typescript
/** @deprecated Use computeGlobalPrice for channel-specific pricing.
 *  Kept for backward compatibility with existing exports that don't need tax calculation. */
export function computeSellPrice(costUsd: number) {
  const result = computeGlobalPrice({
    productCostUsd: costUsd,
    shippingCostUsd: 0, // sourced is bundled into the $20 Sourcing Fee
    targetCountry: 'KR',
    channelCode: 'lexi',
  });
  return result.finalPriceUsd;
}
```

> 이 방식으로 기존 호환성을 유지하면서 신규 코드는 `computeGlobalPrice` 사용.

---

## 7. 데이터베이스 스키마 변경

### 7.1 `products` 테이블 확대

```sql
-- New columns for channel-aware pricing

ALTER TABLE products ADD COLUMN IF NOT EXISTS base_sell_price numeric(10,2);
  -- 기본 판매가 (모든 채널 공통 — 가장 높은 채널가 기준)

ALTER TABLE products ADD COLUMN IF NOT EXISTS krp_price numeric(10,2);
  -- 한국어 storefront 표시가 (KRW 환산)

ALTER TABLE products ADD COLUMN IF NOT EXISTS last_pricing_sync timestamp without time zone;
  -- 마지막 가격 동기화 시각 (환율/세금 정책 변경 시 reprice 트리거용)

ALTER TABLE products ADD COLUMN IF NOT EXISTS hs_category varchar(32);
  -- HS Code 카테고리 (apparel, cosmetics, electronics...)
  -- catalog.categoryPath 에서 자동 추론하거나 수동 할당
```

### 7.2 `channel_prices` 테이블 새로 생성

```sql
CREATE TABLE channel_prices (
  id bigserial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id),
  channel_code varchar(32) NOT NULL,  -- coupang, shopify, amazon_au, shopee, cafe24, lexi
  currency varchar(3) NOT NULL,       -- KRW, AUD, SGD, MYR, IDR, USD
  sell_price numeric(12,2) NOT NULL,  -- 현지 통화 리스팅가
  sell_price_usd numeric(10,2) NOT NULL, -- USD 등가 (비교/집계용)
  cif_usd numeric(10,2),              -- 원가+배송 USD
  import_tax_usd numeric(10,2),       -- 해당 국가 관부세 USD
  duty_tariff_usd numeric(10,2),
  duty_vat_usd numeric(10,2),
  fx_rate_used numeric(10,6),         -- 적용 환율
  margin_rate numeric(5,4),           -- 적용 마진율
  platform_fee_rate numeric(5,4),     -- 플랫폼 수수료율
  pricing_version integer DEFAULT 1,  -- 가격 정책 변경 시 increment
  sync_status text DEFAULT 'pending', -- pending | synced | failed
  last_synced_at timestamp,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(product_id, channel_code)
);

-- Indexes
CREATE INDEX idx_channel_prices_product ON channel_prices(product_id);
CREATE INDEX idx_channel_prices_channel ON channel_prices(channel_code);
```

### 7.3 `fx_rates_cache` 테이블 새로 생성

```sql
CREATE TABLE fx_rates_cache (
  id bigserial PRIMARY KEY,
  base_currency varchar(3) NOT NULL DEFAULT 'USD',
  target_currency varchar(3) NOT NULL,
  rate numeric(10,6) NOT NULL,           -- 1 USD = X target
  buffered_rate numeric(10,6) NOT NULL,   -- rate * 1.025
  fetched_at timestamp NOT NULL,
  expires_at timestamp NOT NULL,
  source varchar(32) DEFAULT 'api',       -- api | manual | fallback
  UNIQUE(base_currency, target_currency, date(fetched_at))
);

-- Daily cron job triggers update at 00:00 UTC
CREATE INDEX idx_fx_rates_target ON fx_rates_cache(target_currency);
CREATE INDEX idx_fx_rates_latest ON fx_rates_cache(target_currency, fetched_at DESC);
```

### 7.4 Drizzle ORM Schema 정의

```typescript
// src/db/schema.ts 에 추가

export const channelPrices = pgTable('channel_prices', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  channelCode: varchar('channel_code', { length: 32 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  sellPrice: decimal('sell_price', { precision: 12, scale: 2 }).notNull(),
  sellPriceUsd: decimal('sell_price_usd', { precision: 10, scale: 2 }).notNull(),
  cifUsd: decimal('cif_usd', { precision: 10, scale: 2 }),
  importTaxUsd: decimal('import_tax_usd', { precision: 10, scale: 2 }),
  dutyTariffUsd: decimal('duty_tariff_usd', { precision: 10, scale: 2 }),
  dutyVatUsd: decimal('duty_vat_usd', { precision: 10, scale: 2 }),
  fxRateUsed: decimal('fx_rate_used', { precision: 10, scale: 6 }),
  marginRate: decimal('margin_rate', { precision: 5, scale: 4 }),
  platformFeeRate: decimal('platform_fee_rate', { precision: 5, scale: 4 }),
  pricingVersion: integer('pricing_version').default(1),
  syncStatus: text('sync_status').default('pending'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  uniqProductChannel: unique().on(t.productId, t.channelCode),
}));

export const fxRatesCache = pgTable('fx_rates_cache', {
  id: serial('id').primaryKey(),
  baseCurrency: varchar('base_currency', { length: 3 }).default('USD').notNull(),
  targetCurrency: varchar('target_currency', { length: 3 }).notNull(),
  rate: decimal('rate', { precision: 10, scale: 6 }).notNull(),
  bufferedRate: decimal('buffered_rate', { precision: 10, scale: 6 }).notNull(),
  fetchedAt: timestamp('fetched_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  source: text('source').default('api'),
});
```

---

## 8. 환율 서비스 설계

### 8.1 ExchangeRateService

**파일 위치:** `src/lib/pricing/fx-rates.ts`

```typescript
/**
 * 환율 서비스
 * - API: exchangerate-api.com (free tier 1500 req/mo) 또는 open.er-api.com
 * - 캐시: fx_rates_cache 테이블 (TTL 24h)
 * - 버퍼: +2.5% 변동성 reserve
 * - 실패 시fallback: 마지막 성공 cached rate * 0.98 (약세 방어)
 */

export async function getFxRate(
  targetCurrency: string,
): Promise<{ rate: number; buffered: number; source: string }> {
  // 1. Cache hit check (expires_at > now)
  // 2. If miss/expired → API fetch
  // 3. If API fail → fallback to last cached
  // 4. Store to fx_rates_cache
  // 5. Return { rate, buffered: rate * 1.025, source }
}

export async function refreshAllFxRates() {
  const targets = ['KRW', 'AUD', 'SGD', 'MYR', 'IDR'];
  for (const t of targets) {
    await getFxRate(t);
  }
}
```

### 8.2 Cron Job (Vercel/Next.js Revalidation)

```typescript
// src/app/api/cron/fx-refresh/route.ts
export async function GET(req: Request) {
  await refreshAllFxRates();
  return NextResponse.json({ ok: true });
}
// Schedule: daily via Vercel Cron or internal scheduled endpoint
```

---

## 9. DDP vs DDU 전략 결정 매트릭스

| 조건 | DDP (세금이음) | DDU (세금분리) |
|------|---------------|---------------|
| **De Minimis 미만** | 마진에 세금 비용 포함 → 약간의 가격 상승 | 가격이 낮게 보임 → 더 나은 전환 |
| **De Minimis 초과** | 가격에 세금 미리 포함 → 구매자 부담 0 | 통관 시 구매자 추가 비용 → 반품률↑ |
| **낮은 가격 상품 (<$50)** | 관세 미미 → DDP 추천 | DDU 장점 거의 없음 |
| **높은 가격 상품 (>$150)** | 예상 세금 포함 정확히 → 신뢰도↑ | 통관 Surprise로 반품/불만↑ |
| **Platform Facilitator** | 플랫폼이 세금 징수 → 판매가는 세금 미포함 | 중복과세 방지 필수 |
| **기본 정책** | **전상품 DDP 기본** | DDU는 고価格/특수货品만 |

### 결론: **DDP 기본 + Facilitator 마켓 제외**

- Coupang, Cafe24, LEXI: **DDP** (판매자가 세금 포함한 가격 표기)
- Amazon AU, Shopee SG/MY/ID: **Effective DDU** (플랫폼이 자동 징수 → 판매가는 세금 제외 또는 별도 처리)
- Shopify: **_country_by_store_별로 유연_** (Storefront 설정에 따라 DDP/DDU切换)

---

## 10. 마이그레이션 계획

### Phase 1: Backward Compatible (기존 코드 유지)
- `channel_prices`, `fx_rates_cache` 테이블생성
- `computeGlobalPrice` 구현 (기존 `computeSellPrice` wrapper 유지)
- 신규 Import 상품부터 `channel_prices` 생성 시작

### Phase 2: Batch Repricing (기존商品 재계산)
- CLI script: `scripts/reprice-all-products.ts`
  - 모든 `is_dummy=false` 상품 조회
  - 채널별로 `computeGlobalPrice` 재계산
  - `channel_prices` INSERT/UPDATE
  - `products.price_usd` = `max(channel_prices.sell_price_usd)` 업데이트
- HQ Admin UI에서 "Reprice All" 버튼 제공

### Phase 3: Full Migration (기존 코드 제거)
- `computeSellPrice` deprecated → 경고 로그
- Export pipeline이 항상 `channel_prices` 사용하도록 고정
- legacy fallback (`retail_price_usd` 등) 점진적 제거

### 10.1 Batch Repricing Script 구조

```typescript
// scripts/reprice-all-products.ts
import { computeGlobalPrice } from '@/lib/pricing/global-calculator';
import { db } from '@/db';
import { products, channelPrices } from '@/db/schema';

async function main() {
  const allProducts = await db().select().from(products);
  const channels = ['coupang', 'shopify', 'amazon_au', 'shopee', 'lexi'];

  for (const p of allProducts) {
    // Get cost from catalog_index or supplier_products
    const costUsd = parseFloat(p.price_usd!); // fallback: current price
    const shippingUsd = 0; // bundled in sourcing fee

    for (const ch of channels) {
      try {
        const result = computeGlobalPrice({
          productCostUsd: costUsd,
          shippingCostUsd: shippingUsd,
          targetCountry: jurisdictionForChannel(ch),
          channelCode: ch,
          hsCategory: p.hs_category as HsCategory | undefined,
        });

        // Upsert channel_prices
        await db().insert(channelPrices).values({
          productId: Number(p.id),
          channelCode: ch,
          currency: result.currency,
          sellPrice: String(result.localPrice),
          sellPriceUsd: String(result.finalPriceUsd),
          cifUsd: String(result.cifUsd),
          importTaxUsd: String(result.importTaxUsd),
          dutyTariffUsd: String(result.dutyBreakdown.tariff),
          dutyVatUsd: String(result.dutyBreakdown.vatOrGst),
          fxRateUsed: String(result.fxRateUsed),
          pricingVersion: 1,
        }).onConflictDoUpdate({
          target: [channelPrices.productId, channelPrices.channelCode],
          set: { /* all fields above */ },
        });
      } catch (e) {
        console.error(`Failed to reprice product ${p.id} channel ${ch}:`, e);
      }
    }
  }
}
```

---

## 11. 테스트 전략

### 11.1 Unit Tests

| 테스트 케이스 | 입력 | 기대 출력 |
|-------------|------|----------|
| KR <$150 (면세) | cost=$20, ship=$10, KR, apparel | tax=$0, final=$54.55 USD |
| KR >$150 (과세) | cost=$100, ship=$20, KR, cosmetics | tariff=$10, vat=$11, final=$... |
| AU <$1000 AUD (GST만) | cost=$20, ship=$10, AU | gst=$3, final=$... |
| AU >$1000 AUD (dut+gst) | cost=$400, ship=$50, AU | tariff=$25, gst=$47.5 |
| SG <$400 SGD (LVG GST) | cost=$20, ship=$10, SG | gst=$2.7 |
| ID <$3 (effectively always taxed) | cost=$1, ship=$1, ID | tariff+vat+income=$... |
| Margin+Fee ≥ 1.0 | margin=0.6, fee=0.5 | Error thrown |
| FX Buffer 적용 | any | fxRateUsed = rawRate * 1.025 |

### 11.2 Integration Tests

1. **End-to-End Pipeline:**
   - Mock CJ API → Import → `computeGlobalPrice` → `channel_prices` 생성 → Export API 호출 검증
   
2. **Batch Repricing:**
   - `reprice-all-products.ts` 실행 후 DB 상태 검증 (모든 채널价格 정확히 계산되었는지)

3. **FX Rate Refresh:**
   - `refreshAllFxRates()` → `fx_rates_cache` on UPDATE 되었는지 검증
   - API 장애 시 fallback 동작 검증

### 11.3 Contract Tests (/channel별)

- `projectForCoupang()`: 고시사항에 세금 포함 메시지 반영
- `projectForAmazonAu()`: Marketplace Facilitator 주의사항 reflection
- `projectForShopee()`: LVG GST/LVGT 메시지
- `projectForShopify()`: 다국어/다통화 지원

---

## 12. 파일 경로 정리

### 새로 생성하는 파일

| 파일 | 설명 |
|------|------|
| `src/lib/pricing/global-calculator.ts` | 국가별 세금 계산 엔진核心 |
| `src/lib/pricing/fx-rates.ts` | 환율 캐시 및 API 연동 |
| `src/app/api/cron/fx-refresh/route.ts` | 일간 환율 자동 갱신 크론 |
| `scripts/reprice-all-products.ts` | 기존 상품 일괄 재계산 CLI |
| `tests/global-pricing.test.ts` | 단위/통합 테스트 |
| `docs/global-pricing-engine.md` | 이 문서 |

### 수정하는 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/hq/types.ts` | `computeSellPrice` deprecated 주석, `computeGlobalPrice` re-export |
| `src/lib/catalog/import.ts` | Import 시 `computeGlobalPrice` 호출, `channel_prices` 생성 |
| `src/lib/export/jobs.ts` | Export 시 채널별 `sellPriceUsd` 사용 |
| `src/db/schema.ts` | `channelPrices`, `fxRatesCache` 테이블 정의 추가 |
| `src/lib/pdp/storefront.ts` | `STOREFRONT_DIRECT_IMPORT_NOTICE_HTML` 업데이트 (별도 작업) |
| `src/app/[lng]/product/\[slug\]/page.tsx` | USP 문구 및 6항목 고지문 (별도 작업) |

### 선택적 확장 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/catalog/cj-schema.ts` | `hsCode` field Zod 스키마 추가 (CJ API에 있으면) |
| `src/lib/sourcing/connectors/cjdropshipping.ts` | `mapProduct()`에 HS Code mapping |
| `src/components/admin/reprice-panel.tsx` | admin UI "Reprice All" 버튼 |

---

## 13. 리스크 및 완화책

| 리스크 | 심각도 | 완화책 |
|--------|--------|--------|
| CJ API에 HS Code 없음 | 높음 | categoryPath 기반 heuristic mapping으로 우회. 이후 CJ에 HS Code 요청 |
| 환율 API 유료 전환 | 중 | 무료 API (open.er-api.com) 1500req/mo 충분. 실패 시 cached fallback |
| Marketplace Facilitator 정책 변경 | 중 | `channel_prices.pricing_version`으로 추적. 정책 변경 시 재계산 스크립트 |
| 인도네시아 통관 규제 급변 | 높 | `DE_MINIMIS_USD[ID]`와 세율 상수를 config table로 이동 → 코드 변경 없이 hot-fix |
| 대량 Recompute 시 DB 부하 | 낮 | 배치 크기 100건/unit, chunked processing |

---

## 14. 구현 우선순위 (추천 순서)

1. **P0:** `src/lib/pricing/global-calculator.ts` 설계 및 구현 (핵심 계산 엔진)
2. **P0:** `src/db/schema.ts` 새 테이블 스키마 (channel_prices, fx_rates_cache) + `db:push`
3. **P1:** `src/lib/pricing/fx-rates.ts` 환율 서비스 (cached + API)
4. **P1:** Import pipeline 통합 (`import.ts`에서 `computeGlobalPrice` 호출)
5. **P2:** Export pipeline 통합 (`jobs.ts`에서 channel별 가격 사용)
6. **P2:** `scripts/reprice-all-products.ts` 배치 재계산 CLI
7. **P3:** Admin UI "Reprice All" 패널
8. **P3:** Cron job (일간 환율 refresh)
9. **P3:** 테스트 스위트 구축

---

## 15. 요약

이 파이프라인은 현재 단일公式 `computeSellPrice()` 를 대체하여:

- **CJ 공급처 원가** → **국가별 import tax** → **채널별 최종 리스팅가**까지 자동 계산
- **DDP 기본 정책**으로 구매자 경험 최적화
- **HS Code mapping**으로 관세 정밀화
- **실시간 환율 + 버퍼**로 역마진 방지
- **Marketplace Facilitator** 중복과세 회피
- **배치 마이그레이션**으로 기존 상품도 순차적 적용

이로써 LEXI는 진정한 다국적 마켓플레이스 판매자로서의 가격 경쟁력과 법적 준拠성을 확보한다.
