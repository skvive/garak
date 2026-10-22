/**
 * SAMPLE3 — reusable LEXI editorial PDP page style (layout / copy / OG / brand).
 * Live: https://lexistyle.vercel.app/sample3
 * Docs: docs/lexi-sample3-pdp-style.md
 * Skill: .cursor/skills/lexi-sample3-pdp/SKILL.md (+ spec-table.md)
 *
 * Product DNA (silhouette, embroidery, SKU title) stays in per-SKU seeds (e.g. LEXI1).
 * Page grammar always comes from here so any SKU can ship in the same style.
 */
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import { PDP_RULESET_ID } from "@/lib/pdp/ruleset";

export const SAMPLE3_STYLE_ID = "SAMPLE3" as const;

export const SAMPLE3_TOKENS = {
  paper: "#faf9f7",
  ink: "#1a1a1a",
  accent: "#e85d4c",
  cream: "#ebe6dc",
  fog: "#6e6e73",
  line: "#e8e4dc",
  radius: "14px",
  heroRatio: "4/5",
  brand: "LEXI",
} as const;

/** Fixed block order for SAMPLE3 HTML / ConceptSpec */
export const SAMPLE3_BLOCK_PLAN = [
  "brand",
  "hero",
  "gallery",
  "brand-mark",
  "og",
  "usp",
  "story",
  "styling",
  "spec",
  "faq",
  "cta",
] as const;

/** Visible OG preview block for SAMPLE3 HTML pages — no internal meta captions */
export function sample3OgPreviewHtml(opts: {
  ogSrc: string;
  title: string;
  caption?: string;
}): string {
  const cap = opts.caption?.trim()
    ? `\n    <figcaption>${opts.caption.trim()}</figcaption>`
    : "";
  return `<section class="pad og-preview" data-block="og">
  <p class="section-kicker">SHARE · OG</p>
  <h2 class="section-title">LEXI OG 이미지</h2>
  <figure class="og-card">
    <img src="${opts.ogSrc}" alt="${opts.title}" width="1200" height="630"/>${cap}
  </figure>
</section>`;
}

export const SAMPLE3_BRAND_NOTE_HTML =
  `<strong>LEXI IS RPCOW.</strong><br/>Radiant Presence, Captivating Outfit for your Wardrobe.`;

export const SAMPLE3_COPY_RULES = `
SAMPLE3 LEXI editorial PDP style (reuse for any SKU):
- Brand is always LEXI. Never competitor names or fake certs/reviews/sales counts/%.
- Brand exposure: top "LEXI." wordmark, brand-strip "Curated by LEXI", CTA with LEXI, footer © LEXI.
- Optional garment brand mark: small embroidered/printed "LEXI" + product motif (left chest or natural placement); generate 2–3 mockups, pick one hero.
- Length ~1.5×: eyebrow + subtitle + lead; story 2 paragraphs; usps×3; styling notes×3; faq×3; brand-note×1.
- Brand-note fixed line: "LEXI IS RPCOW. / Radiant Presence, Captivating Outfit for your Wardrobe."
- Voice: quiet editorial romance — "담백한 설렘" / LEXI Curated. Korean UI; no letter-spacing on Hangul; no emoji bullets; no purple gradients.
- Locales ko | en | ms share schema.
- OG required on publish: 1200×630 cream paper, "LEXI." + coral period, product hero, English marketing title on bake; no stars/prices/watermarks.
- Always show OG on the PDP body via \`sample3OgPreviewHtml\` (SHARE · OG section) — image only, no internal meta captions.
- Never expose programming internals on the page (ruleset ids, face-lock, cost formulas, externalId, og:image wiring notes).
- Images: 3-act hero/macro/trust continuity; on-image labels English only.
`.trim();

export const SAMPLE3_OG_PROMPT_TEMPLATE = (
  productTitleEn: string,
  garmentHint: string,
) =>
  `Create a LEXI brand Open Graph social share image, 16:9 landscape (~1200×630), editorial commerce.
Cream paper background (#faf9f7 / warm beige), ink black typography.
Large refined "LEXI" wordmark top-left with coral accent period (#e85d4c).
Hero product: ${garmentHint}. Soft morning window light, magazine crop, generous negative space.
Bottom thin line: "${productTitleEn}" in English marketing title, clean sans.
No fake stars, no price stickers, no watermarks, no purple gradients.`;

export type Sample3ImagePlan = NonNullable<
  NonNullable<ConceptSpec["imageRecipe"]>["plan"]
>;

export type Sample3SkuInput = {
  /** Product ruleset id, e.g. LEXI1 */
  rulesetId: string;
  title: string;
  formHint: string;
  voiceTag?: string;
  seedCatalogId?: number;
  imagePlan?: Sample3ImagePlan;
};

/** Build a ConceptSpec locked to SAMPLE3 page grammar for any SKU. */
export function sample3ConceptSpec(input: Sample3SkuInput): ConceptSpec {
  const voice =
    input.voiceTag ??
    `${input.rulesetId} · SAMPLE3 · 담백한 설렘 · brand-forward`;
  const plan: Sample3ImagePlan =
    input.imagePlan ??
    [
      {
        role: "hero",
        size: "portrait",
        prompt: `Hero fashion editorial for LEXI brand. ${input.formHint}. Soft morning window light, cream paper mood, K-fashion magazine, brand atmosphere LEXI, no text, no competitor logos, 3:4.`,
      },
      {
        role: "macro",
        size: "portrait",
        prompt: `Detail of the same garment: texture, stitch or signature motif, soft folds, lifestyle light for LEXI lookbook, no logos, no text, 3:4. Product: ${input.formHint}.`,
      },
      {
        role: "trust",
        size: "portrait",
        prompt: `Lifestyle wear of the same product, warm sunset or cafe plaza, easy daily romance, cream-ink palette, LEXI campaign confidence, no on-screen text, 3:4. Product: ${input.formHint}.`,
      },
    ];

  return {
    layoutId: "editorial-fullbleed",
    tokens: {
      paper: SAMPLE3_TOKENS.paper,
      ink: SAMPLE3_TOKENS.ink,
      accent: SAMPLE3_TOKENS.accent,
      radius: SAMPLE3_TOKENS.radius,
      heroRatio: SAMPLE3_TOKENS.heroRatio,
      brand: SAMPLE3_TOKENS.brand,
      ruleset: input.rulesetId,
      style: SAMPLE3_STYLE_ID,
    },
    blockPlan: [...SAMPLE3_BLOCK_PLAN],
    voice,
    copyRuleset: PDP_RULESET_ID,
    imageRecipe: {
      generate: true,
      style: `SAMPLE3 + ${input.rulesetId}: ${input.formHint}, cream paper editorial, LEXI brand mood, no competitor logos, no on-image text`,
      backgroundPolicy: "replace",
      replacePrompt:
        "cafe window and soft plaza lifestyle for LEXI campaign, brand-forward editorial",
      plan,
    },
    locale: "ko",
    seedCatalogId: input.seedCatalogId,
  };
}
