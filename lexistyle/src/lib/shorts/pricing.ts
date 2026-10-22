/**
 * 크레딧 원가 상한. 플랜 단가 대비 렌더 원가가 35%를 넘으면(마진 65% 미만)
 * 비싼 영상 API(Wan)를 쓰지 않고 Remotion으로 내린다.
 * 원가 숫자는 고객 화면에 노출하지 않는다.
 */
export const RENDER_COST_USD = {
  remotion: 0.04, // 워커 CPU·Blob. 더빙 없음
  wan_i2v: 0.55, // 이미지→영상 1클립 상한 추정치
} as const;

/** 원가 / 크레딧 단가. 이 비율 이하만 허용 → 마진 65%+ */
export const MAX_COST_RATIO = 0.35;

export const PUBLIC_PLANS: Record<string, { label: string; priceUsd: number; monthlyCredits: number; watermark: boolean }> = {
  free: { label: "Free", priceUsd: 0, monthlyCredits: 2, watermark: true },
  starter: { label: "Starter", priceUsd: 29, monthlyCredits: 15, watermark: true },
  pro: { label: "Pro", priceUsd: 79, monthlyCredits: 50, watermark: false },
  agency: { label: "Agency", priceUsd: 199, monthlyCredits: 200, watermark: false },
};

const PRICE: Record<string, { priceUsd: number; monthlyCredits: number }> = PUBLIC_PLANS;

/** 크레딧 1개의 매출(USD). 무료 플랜은 0 */
export function creditRevenueUsd(plan: string): number {
  const p = PRICE[plan] ?? PRICE.free;
  if (p.priceUsd <= 0 || p.monthlyCredits <= 0) return 0;
  return p.priceUsd / p.monthlyCredits;
}

export function withinMargin(strategy: keyof typeof RENDER_COST_USD, plan: string): boolean {
  const revenue = creditRevenueUsd(plan);
  if (revenue <= 0) return strategy === "remotion";
  return RENDER_COST_USD[strategy] <= revenue * MAX_COST_RATIO;
}

/** 대본이 모션을 원해도, 마진이 안 남거나 키가 없으면 Remotion */
export function allowedStrategy(plan: string, wantsWan: boolean): "wan_i2v" | "remotion" {
  if (wantsWan && withinMargin("wan_i2v", plan)) return "wan_i2v";
  return "remotion";
}
