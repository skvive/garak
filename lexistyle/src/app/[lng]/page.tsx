import { HeroEditorial } from "@/components/sections/hero-editorial";
import { PriceTicker } from "@/components/sections/price-ticker";
import { DeliveryCountdown } from "@/components/sections/delivery-countdown";
import { ProcessStrip } from "@/components/sections/process-strip";
import { QuickLinks } from "@/components/sections/quick-links";
import { CategoryChips } from "@/components/sections/category-chips";
import { PromoSets } from "@/components/sections/promo-sets";
import { RealtimeRanking } from "@/components/sections/realtime-ranking";
import { TimeDealSection } from "@/components/sections/time-deal-section";
import { SeasonPick } from "@/components/sections/season-pick";
import { ShopTheLookSection } from "@/components/sections/shop-the-look-section";
import { BrandSpotlight } from "@/components/sections/brand-spotlight";

export const dynamic = "force-dynamic";

/**
 * 스토어프론트 홈 — 에디토리얼 메인 고정.
 * 가락한상 히어로 및 상품 그리드 직결.
 */
export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">가락한상 — 가락시장의 신선함을 집 앞까지, 식탁 위 완벽한 수산 한 상</h1>
      <HeroEditorial />
      <PriceTicker />
      <DeliveryCountdown />
      <ProcessStrip />
      <QuickLinks />
      <CategoryChips />
      <PromoSets />
      <RealtimeRanking />
      <TimeDealSection />
      <SeasonPick />
      <ShopTheLookSection />
      <BrandSpotlight />
    </>
  );
}
