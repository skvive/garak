/** LEXI PDP ruleset v1 — Gemini 구조화 출력 계약 */
import { MARKETING_COPY_RULES } from "./marketing-prompt";

export const PDP_RULESET_ID = "lexi-pdp-ruleset-v1";

export const PDP_REQUIRED_BLOCKS = ["hero", "usp", "gallery", "spec-table", "faq", "cta"] as const;

export const PDP_SYSTEM_PROMPT = `You are LEXI's editorial PDP designer for a reverse cross-border K-style commerce brand.
Return ONLY valid JSON matching the schema. No markdown fences.

Rules:
- Brand voice: refined, warm, confident. Korean-friendly English OK for titles; body can be Korean or English based on locale.
- Never invent certifications, clinical claims, or fake review counts / rankings.
- Never use supplier spam words: cheap, wholesale, dropshipping, free shipping, hot sale.
- Do not paste supplier HTML; rewrite editorially.
- USP: exactly 3 short bullets (sensory benefit, not spam).
- FAQ: exactly 2 Q&As (returns/duties or care).
- CTA label must be shoppable ("Add to bag" / "장바구니 담기" / desire-led Korean CTA).
- Use only provided optimized image URLs in gallery (indexes into assets array).
- Design must feel premium editorial (YesStyle/LEXI), not marketplace dump.
- Ground copy in the given product title and category; do not rename the SKU.

${MARKETING_COPY_RULES}`;

export type PdpStructured = {
  title: string;
  subtitle: string;
  descriptionHtml: string;
  usps: string[];
  faq: { q: string; a: string }[];
  ctaLabel: string;
  seoKeywords: string[];
  galleryAssetIndexes: number[];
};

const SPAM = /\b(cheap|wholesale|dropshipping|hot sale|free shipping|best seller|#\d+\s*sold)\b/i;

export function validatePdp(doc: PdpStructured): string[] {
  const errors: string[] = [];
  if (!doc.title?.trim()) errors.push("title required");
  if (!doc.usps || doc.usps.length < 3) errors.push("usps need 3");
  if (!doc.faq || doc.faq.length < 2) errors.push("faq need 2");
  if (!doc.ctaLabel?.trim()) errors.push("cta required");
  if (SPAM.test(doc.title) || SPAM.test(doc.descriptionHtml ?? "")) errors.push("spam words");
  for (const u of doc.usps ?? []) {
    if (SPAM.test(u)) errors.push("spam in usp");
  }
  return errors;
}

/** 채널별 금칙어·글자수 게이트 (Phase F — Nono형) */
export function validatePdpForChannel(channel: string, doc: PdpStructured): string[] {
  const errors: string[] = [];
  const title = doc.title ?? "";
  const desc = doc.descriptionHtml ?? "";

  if (channel === "coupang") {
    if (title.length > 100) errors.push("coupang:title max 100");
    if (/[^\u0000-\u007F\uAC00-\uD7A3\s\-·.,!?()]/.test(title)) errors.push("coupang:title special chars");
    if (desc.length > 50_000) errors.push("coupang:body too long");
  }
  if (channel === "shopify") {
    if (title.length > 255) errors.push("shopify:title max 255");
    if (desc.length > 65_535) errors.push("shopify:body_html max 65535");
  }
  if (channel === "amazon_au") {
    if (title.length > 200) errors.push("amazon_au:item_name max 200");
    if ((doc.usps?.length ?? 0) < 3) errors.push("amazon_au:need 3 bullets");
    for (const u of doc.usps ?? []) {
      if (u.length > 500) errors.push("amazon_au:bullet max 500");
    }
    if (SPAM.test(title)) errors.push("amazon_au:spam title");
  }
  if (channel === "shopee") {
    if (title.length > 120) errors.push("shopee:item_name max 120");
    if (desc.replace(/<[^>]+>/g, " ").length > 3000) errors.push("shopee:description max 3000");
    if (SPAM.test(title)) errors.push("shopee:spam title");
  }
  if (channel === "cafe24") {
    if (title.length > 250) errors.push("cafe24:title max 250");
  }
  return errors;
}

export function templatePdp(input: {
  title: string;
  category: string;
  price: string;
  seller?: string;
}): PdpStructured {
  const title = input.title.replace(/\b(cheap|wholesale|dropshipping|hot sale)\b/gi, "").replace(/\s{2,}/g, " ").trim();
  return {
    title: title.slice(0, 80),
    subtitle: `From the ${input.category} edit`,
    descriptionHtml: `<p>${title} — redesigned for LEXI with duty-aware pricing and curated presentation.</p>`,
    usps: [
      `Curated ${input.category.toLowerCase()} pick — quality-checked before shipment`,
      "Duty-calculated checkout: the price you see is the landed cost",
      "In-stock sourcing with tracked dispatch",
    ],
    faq: [
      { q: "Who handles returns?", a: "Supplier A/S center handles returns; LEXI opens and tracks the ticket." },
      { q: "Are duties included?", a: "Checkout totals include estimated duties for your destination." },
    ],
    ctaLabel: "Add to bag",
    seoKeywords: ["LEXI", input.category, "K-style"],
    galleryAssetIndexes: [0, 1, 2].filter((i) => i >= 0),
  };
}
