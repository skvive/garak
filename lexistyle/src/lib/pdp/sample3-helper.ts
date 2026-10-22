// filepath: src/lib/pdp/sample3-helper.ts
/**
 * SAMPLE3 진열 헬퍼 — 카테고리/검색 카드 썸네일을 SAMPLE3 히어로로 치환.
 * resolveStorefrontPdp와 동일한 오버라이드 레지스트리를 재사용한다.
 */
import { getSample3StorefrontOverride } from "./sample3-overrides";
import { getSample3BatchOverride } from "./sample3-batch-overrides";

/** 상품 slug → SAMPLE3 히어로 asset URL (없으면 null) */
export function sample3HeroUrlForSlug(slug: string): string | null {
  const override = getSample3StorefrontOverride(slug);
  if (override?.assetUrls?.[0]) return override.assetUrls[0];

  const batch = getSample3BatchOverride(slug);
  if (batch?.assetUrls?.[0]) return batch.assetUrls[0];

  return null;
}

/** 상품 이미지를 SAMPLE3 히어로로 치환 (없으면 원본 유지) */
export function sample3CardImage(image: string, slug: string): string {
  return sample3HeroUrlForSlug(slug) ?? image;
}