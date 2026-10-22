/**
 * 마케팅 PDP 이미지·카피 프롬프트 — docs/lexi-pdp-marketing-prompt-rules.md
 * 소스 제목·참조 이미지를 반영한 3막(hero/macro/trust) 레시피.
 */

export type MarketingImageRole = "hero" | "macro" | "trust";

export type SourceSeedForPrompt = {
  title: string;
  category?: string;
  /** 형태 힌트 — 병/튜브/박스 등. 없으면 카테고리만 */
  formHint?: string;
};

export type MarketingImagePlanItem = {
  role: MarketingImageRole;
  size: "portrait" | "square" | "landscape";
  prompt: string;
};

const NO_TEXT = "no label text, no logo, no watermark, no readable typography in frame";

/** Act1 — 히어로·후킹 (시안 S1) */
export function buildHeroImagePrompt(seed: SourceSeedForPrompt): string {
  const cat = seed.category?.trim() || "fashion";
  const isFashion = cat.toLowerCase().includes("fashion") || cat.toLowerCase().includes("apparel") ||
    /\b(dress|shirt|top|blouse|jacket|coat|pants|jeans|skirt|sweater|hoodie|knit|cargo|outerwear)\b/i.test(cat);
  if (isFashion) {
    return [
      `Young Asian female fashion editorial model, soft natural makeup, wearing "${seed.title}" garment as main outfit,`,
      "upper body shot, looking at camera, centered face and torso,",
      "clean cream paper studio background (#faf9f7), soft diffused natural window light,",
      "the garment is the hero — sharp focus on fabric texture and silhouette, K-fashion editorial lookbook style,",
      "4:5 portrait, photorealistic, high detail fabric texture,",
      NO_TEXT,
    ].join(" ");
  }
  return [
    `Hero product photo of "${seed.title}".`,
    "Luxury morning light, marble or cream vanity, soft water ripples suggesting moisture and glow,",
    `${cat} editorial commerce, cream paper mood (#faf9f7),`,
    "shallow depth of field, photorealistic, 4:5 portrait,",
    NO_TEXT,
  ].join(" ");
}

/** Act2 — 디테일·소재 매크로 (시안 S2) */
export function buildMacroImagePrompt(seed: SourceSeedForPrompt): string {
  const cat = seed.category?.trim() || "fashion";
  const isFashion = cat.toLowerCase().includes("fashion") || cat.toLowerCase().includes("apparel") ||
    /\b(dress|shirt|top|blouse|jacket|coat|pants|jeans|skirt|sweater|hoodie|knit|cargo|outerwear)\b/i.test(cat);
  if (isFashion) {
    return [
      `Close-up macro detail of "${seed.title}" fabric texture and seam finish,`,
      "soft focus on weave, knit, or drape quality, natural light,",
      "K-fashion textile editorial, square composition, artisanal craftsmanship feel,",
      NO_TEXT,
    ].join(" ");
  }
  return [
    `Macro beauty still of "${seed.title}" texture:`,
    "single luminous droplet or cream swirl matching the color of the source product,",
    "dewy green leaves or clean studio props, shallow depth of field,",
    `${cat} commercial K-style editorial, square composition,`,
    NO_TEXT,
  ].join(" ");
}

/** Act3 — 신뢰·라이프스타일 (시안 S3) — 숫자·별점 텍스트 금지 */
export function buildTrustImagePrompt(seed: SourceSeedForPrompt): string {
  const cat = seed.category?.trim() || "fashion";
  const isFashion = cat.toLowerCase().includes("fashion") || cat.toLowerCase().includes("apparel") ||
    /\b(dress|shirt|top|blouse|jacket|coat|pants|jeans|skirt|sweater|hoodie|knit|cargo|outerwear)\b/i.test(cat);
  if (isFashion) {
    return [
      `Young Asian female model with the same appearance as hero shot, wearing "${seed.title}" garment as main outfit,`,
      "warm minimal lifestyle setting, candid everyday moment, soft natural side light,",
      "cozy interior or outdoor plaza, natural expression showing garment drape and fit,",
      "lifestyle editorial photography, same model same face as hero shot,",
      "leave lower third clear for UI overlay, warm neutrals without readable text or numbers,",
      NO_TEXT,
    ].join(" ");
  }
  return [
    `Unboxing lifestyle of "${seed.title}" in an open gift box with satin lining,`,
    "soft peach-cream bokeh sparkle without readable stars or numbers,",
    "editorial commerce, leave calm lower third for UI overlay,",
    "photorealistic, warm neutrals,",
    NO_TEXT,
  ].join(" ");
}

export function buildMarketingImagePlan(seed: SourceSeedForPrompt): MarketingImagePlanItem[] {
  return [
    { role: "hero", size: "portrait", prompt: buildHeroImagePrompt(seed) },
    { role: "macro", size: "square", prompt: buildMacroImagePrompt(seed) },
    { role: "trust", size: "landscape", prompt: buildTrustImagePrompt(seed) },
  ];
}

/** 시스템 프롬프트에 붙는 3막 카피 규칙 (허위 수치 금지) */
export const MARKETING_COPY_RULES = `
Marketing 3-act structure (map into JSON fields):
- Act1 Hook: subtitle = desire line; descriptionHtml first <p> = pain → desire (no clinical %).
- Act2 Benefit: usps exactly 3 sensory/benefit lines; never invent ingredients/certifications not in source.
- Act3 Trust: faq 2 items (returns/duties or care); ctaLabel = one clear shoppable action.
- Forbidden: fake review counts, rankings, EWG/clinical claims unless explicitly provided in source facts.
- Korean locale: body 14px feel, no letter-spacing tricks; warm editorial LEXI voice.
`.trim();
