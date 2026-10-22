/**
 * 정산 귀속 법인 라우팅 — 2법인(테라브릿지캐피탈 US / 파트너스 사회적협동조합 KR) 구조.
 *
 * 3개 트랙:
 *   A. 해외 대형   : 해외 구매자 & 주문 ≥ 임계값($100)  → 테라브릿지(Stripe/USD)
 *   B. 국내 판매   : 한국 구매자                        → 파트너스(Toss/KRW, 위탁판매 수탁)
 *   C. 해외 소규모 : 해외 구매자 & 주문 < 임계값          → 파트너스(역직구 테스트)
 *
 * 파트너스 매출 상한(월 3,000만원)을 넘지 않도록 가드:
 *   - 국내(B)는 대안이 없어(한국 셀러 오브 레코드) 항상 파트너스로 가되, 상한 근접 시 경고 플래그.
 *   - 해외 소규모(C)는 "플렉스" 물량 → 파트너스 헤드룸이 있을 때만 파트너스, 상한 근접 시 테라브릿지로 우회.
 */

export type PayoutEntity = "terrabridge" | "partners-coop";
export type PayoutTrack = "A_overseas_large" | "B_domestic" | "C_overseas_test";

export type PayoutConfig = {
  /** 해외 대형/소규모 구분 주문금액 임계값 (USD). 기본 $100 */
  largeThresholdUsd: number;
  /** 파트너스 사회적협동조합 월 매출 상한 (KRW). 기본 3,000만원 */
  partnersMonthlyCapKrw: number;
  /** 상한의 몇 %에서 해외소규모(C)를 테라브릿지로 우회할지. 기본 0.9(=2,700만원) */
  partnersCapGuardRatio: number;
  /** 국내 위탁판매 수탁 수수료율 (파트너스가 취하고 나머지는 테라브릿지로 정산). 기본 0.1 */
  consignmentRate: number;
};

export function payoutConfig(): PayoutConfig {
  return {
    largeThresholdUsd: Number(process.env.PAYOUT_LARGE_THRESHOLD_USD || 100),
    partnersMonthlyCapKrw: Number(process.env.PARTNERS_MONTHLY_CAP_KRW || 30_000_000),
    partnersCapGuardRatio: Number(process.env.PARTNERS_CAP_GUARD_RATIO || 0.9),
    consignmentRate: Number(process.env.PARTNERS_CONSIGNMENT_RATE || 0.1),
  };
}

export type PayoutInput = {
  /** 구매자/배송 국가 (ISO2). KR = 국내 */
  country: string;
  /** 주문 매출 (USD 환산) */
  amountUsd: number;
  /** 이번 달 파트너스 귀속 누적 매출 (KRW). 상한 가드 판정용 */
  partnersMtdKrw: number;
  /** USD→KRW 환율 (상한 가드 환산용). 미지정 시 USD_KRW_RATE(기본 1350) */
  usdKrwRate?: number;
};

export type PayoutDecision = {
  entity: PayoutEntity;
  track: PayoutTrack;
  /** 이 주문이 파트너스 월 상한에 산입되는지 */
  countsAgainstPartnersCap: boolean;
  /** 국내(B)인데 상한을 초과함 — 자동 우회 불가, 운영 경고 필요 */
  capExceededAlert: boolean;
  reason: string;
};

/**
 * 정산 귀속 법인 결정. 순수 함수 — 부수효과 없음(테스트 용이).
 */
export function resolvePayoutEntity(input: PayoutInput, cfg: PayoutConfig = payoutConfig()): PayoutDecision {
  const isKR = (input.country ?? "").trim().toUpperCase() === "KR";
  const rate = input.usdKrwRate ?? Number(process.env.USD_KRW_RATE || 1350);
  const amountKrw = input.amountUsd * rate;
  const guardKrw = cfg.partnersMonthlyCapKrw * cfg.partnersCapGuardRatio;
  const partnersHeadroom = guardKrw - input.partnersMtdKrw;

  // 트랙 B: 국내 판매 — 파트너스가 한국 셀러 오브 레코드라 대안 없음.
  if (isKR) {
    const wouldExceed = input.partnersMtdKrw + amountKrw > cfg.partnersMonthlyCapKrw;
    return {
      entity: "partners-coop",
      track: "B_domestic",
      countsAgainstPartnersCap: true,
      capExceededAlert: wouldExceed,
      reason: wouldExceed
        ? `국내 판매(파트너스) — 월 상한 ${krw(cfg.partnersMonthlyCapKrw)} 초과 위험, 운영 검토 필요`
        : "국내 판매 → 파트너스(위탁판매 수탁)",
    };
  }

  // 트랙 A: 해외 대형 — 테라브릿지 직접판매.
  if (input.amountUsd >= cfg.largeThresholdUsd) {
    return {
      entity: "terrabridge",
      track: "A_overseas_large",
      countsAgainstPartnersCap: false,
      capExceededAlert: false,
      reason: `해외 대형(≥$${cfg.largeThresholdUsd}) → 테라브릿지`,
    };
  }

  // 트랙 C: 해외 소규모 테스트 — 파트너스 헤드룸 있으면 파트너스, 없으면 테라브릿지로 우회.
  if (amountKrw <= partnersHeadroom) {
    return {
      entity: "partners-coop",
      track: "C_overseas_test",
      countsAgainstPartnersCap: true,
      capExceededAlert: false,
      reason: "해외 소규모 테스트 → 파트너스(역직구)",
    };
  }
  return {
    entity: "terrabridge",
    track: "A_overseas_large",
    countsAgainstPartnersCap: false,
    capExceededAlert: false,
    reason: `해외 소규모지만 파트너스 상한 가드(${krw(guardKrw)}) 근접 → 테라브릿지로 우회`,
  };
}

/**
 * 국내 위탁판매(트랙 B)의 정산 분해: 파트너스 수탁 수수료 / 테라브릿지 송금액.
 * 트랙 A·C는 단일 귀속이라 수수료 분해 없음(수탁 수수료 0).
 */
export function splitConsignment(
  decision: PayoutDecision,
  revenueUsd: number,
  cfg: PayoutConfig = payoutConfig(),
): { consignmentCommissionUsd: number; remitToPrincipalUsd: number } {
  if (decision.track !== "B_domestic") {
    return { consignmentCommissionUsd: 0, remitToPrincipalUsd: 0 };
  }
  const commission = +(revenueUsd * cfg.consignmentRate).toFixed(2);
  return {
    consignmentCommissionUsd: commission,
    remitToPrincipalUsd: +(revenueUsd - commission).toFixed(2),
  };
}

function krw(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}
