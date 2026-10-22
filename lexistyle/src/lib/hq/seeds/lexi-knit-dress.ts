/**
 * HQ seed — LEXI color-block knit mini dress ConceptSpec
 * Used by factory lock + Wan marketing image/video.
 */
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import { PDP_RULESET_ID } from "@/lib/pdp/ruleset";

export const LEXI_KNIT_DRESS_PRODUCT = {
  brand: "LEXI",
  title: "LEXI 배색 브이넥 슬림핏 니트 미니 원피스",
  category: "패션 · 원피스",
  price: "USD 42",
  seller: "LEXI Curated",
};

export const LEXI_KNIT_DRESS_ASSETS = {
  s1Hero: "docs/pdp-marketing-mocks/pdp-mock-knit-dress-s1-hero.png",
  s2Detail: "docs/pdp-marketing-mocks/pdp-mock-knit-dress-s2-detail.png",
  s3Desire: "docs/pdp-marketing-mocks/pdp-mock-knit-dress-s3-desire.png",
} as const;

/** Public URLs for Wan i2v (production static). */
export const LEXI_KNIT_DRESS_PUBLIC_URLS = {
  s1: "https://lexistyle.vercel.app/pdp-mocks/pdp-mock-knit-dress-s1-hero.png",
  s2: "https://lexistyle.vercel.app/pdp-mocks/pdp-mock-knit-dress-s2-detail.png",
  s3: "https://lexistyle.vercel.app/pdp-mocks/pdp-mock-knit-dress-s3-desire.png",
} as const;

export function lexiKnitDressConceptSpec(seedCatalogId?: number): ConceptSpec {
  return {
    layoutId: "editorial-fullbleed",
    tokens: {
      paper: "#faf9f7",
      ink: "#1a1a1a",
      accent: "#e85d4c",
      radius: "14px",
      heroRatio: "4/5",
      brand: "LEXI",
    },
    blockPlan: ["hero", "gallery", "usp", "story", "spec", "faq", "cta"],
    voice: "LEXI · 성수 에디토리얼 · color-block knit",
    copyRuleset: PDP_RULESET_ID,
    imageRecipe: {
      generate: true,
      style:
        "LEXI brand editorial. Slim-fit V-neck color-block knit mini dress black soft-pink cream stripes. Premium lookbook, cream paper mood. Brand LEXI emphasized in campaign feel, no competitor logos, no on-image text.",
      backgroundPolicy: "replace",
      replacePrompt: "editorial cafe and plaza lifestyle backgrounds, LEXI K-fashion campaign",
      plan: [
        {
          role: "hero",
          size: "portrait",
          prompt:
            "Hero for LEXI: color-block knit mini dress, morning cafe light, brand mood LEXI editorial",
        },
        {
          role: "macro",
          size: "portrait",
          prompt: "Detail rib knit and V-neck for LEXI lookbook",
        },
        {
          role: "trust",
          size: "portrait",
          prompt: "Full-length desire walk, soft sunset, LEXI campaign confidence",
        },
      ],
    },
    locale: "ko",
    seedCatalogId,
  };
}
