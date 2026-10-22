/**
 * LEXI1 — 하트 자수 반팔 티 제품 DNA 시드
 * Page style: SAMPLE3 (docs/lexi-sample3-pdp-style.md · sample3-style.ts)
 * Product brief: docs/lexi-fashion-pdp-prompt-heart-tee.md · docs/lexi1-pdp-generation-rules.md
 */
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import {
  SAMPLE3_COPY_RULES,
  SAMPLE3_STYLE_ID,
  sample3ConceptSpec,
} from "@/lib/hq/seeds/sample3-style";

export const LEXI1_ID = "LEXI1" as const;

export const LEXI1_PRODUCT = {
  brand: "LEXI",
  rulesetId: LEXI1_ID,
  pageStyle: SAMPLE3_STYLE_ID,
  title: "LEXI 하트 자수 통기 반팔 티",
  category: "패션 · 티셔츠",
  price: "USD 18",
  seller: "LEXI Curated",
  formHint:
    "black short-sleeve crew-neck tee with tiny pink heart embroidery on left chest and small LEXI wordmark above the heart",
};

export const LEXI1_MOCK_ASSETS = {
  s1Hero: "docs/pdp-marketing-mocks/pdp-mock-lexi-heart-tee-s1-hero.png",
  s2Detail: "docs/pdp-marketing-mocks/pdp-mock-lexi-heart-tee-s2-detail.png",
  s3Desire: "docs/pdp-marketing-mocks/pdp-mock-lexi-heart-tee-s3-desire.png",
} as const;

export const LEXI1_PUBLIC_URLS = {
  s1: "https://lexistyle.vercel.app/pdp-mocks/pdp-mock-lexi-heart-tee-s1-hero.png",
  s2: "https://lexistyle.vercel.app/pdp-mocks/pdp-mock-lexi-heart-tee-s2-detail.png",
  s3: "https://lexistyle.vercel.app/pdp-mocks/pdp-mock-lexi-heart-tee-s3-desire.png",
  /** Live SAMPLE3 branded hero (mockup A) */
  s1Brand: "https://lexistyle.vercel.app/sample3/assets/s1-hero-brand.jpg",
  og: "https://lexistyle.vercel.app/sample3/og.jpg",
  livePage: "https://lexistyle.vercel.app/sample3",
} as const;

/** Product DNA + SAMPLE3 page grammar */
export const LEXI1_COPY_RULES = `
LEXI1 product DNA (heart embroidery breathable tee) on SAMPLE3 page style:
${SAMPLE3_COPY_RULES}
- Silhouette: black crew tee, round neck, basic fit, summer breathable cotton feel.
- Chest: tiny soft-pink heart embroidery; preferred hero also has small "LEXI" wordmark above heart.
- Live canon: ${LEXI1_PUBLIC_URLS.livePage}
`.trim();

export function lexi1ConceptSpec(seedCatalogId?: number): ConceptSpec {
  return sample3ConceptSpec({
    rulesetId: LEXI1_ID,
    title: LEXI1_PRODUCT.title,
    formHint: LEXI1_PRODUCT.formHint,
    voiceTag: "LEXI1 · SAMPLE3 · 담백한 설렘 · heart tee · brand-forward",
    seedCatalogId,
    imagePlan: [
      {
        role: "hero",
        size: "portrait",
        prompt:
          "Hero fashion editorial for LEXI brand. Black short-sleeve crew-neck tee with tiny soft-pink heart embroidery on left chest and small LEXI wordmark above the heart. Soft morning window light, cream paper mood, K-fashion magazine, brand atmosphere LEXI, no extra text, 3:4.",
      },
      {
        role: "macro",
        size: "portrait",
        prompt:
          "Detail of the same black cotton tee: pink heart embroidery stitch and LEXI wordmark, fabric breathability, soft folds, lifestyle light for LEXI lookbook, no competitor logos, no extra text, 3:4.",
      },
      {
        role: "trust",
        size: "portrait",
        prompt:
          "Lifestyle walk in the same black heart-embroidery LEXI tee, warm sunset, easy daily romance, cream-ink palette, LEXI campaign confidence, no on-screen text, 3:4.",
      },
    ],
  });
}
