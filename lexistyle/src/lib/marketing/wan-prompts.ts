/**
 * LEXI 마케팅용 Wan(완) 영상 프롬프트 — PDP/숏폼.
 * 이미지 플랜(hero/macro/trust)과 톤을 맞춘다.
 */

export function buildMarketingVideoPrompt(input: {
  productName: string;
  act?: "hero" | "macro" | "trust";
  locale?: "ko" | "en";
  brand?: string;
}): string {
  const name = input.productName.trim() || "K-fashion product";
  const brand = (input.brand ?? "LEXI").trim() || "LEXI";
  const act = input.act ?? "hero";

  if (act === "macro") {
    return [
      `Cinematic detail shot for ${brand}: ${name}.`,
      "Slow push-in on fabric texture and construction, soft key light, shallow depth of field,",
      `${brand} editorial commerce aesthetic, no on-screen text, no logos, no watermarks.`,
    ].join(" ");
  }
  if (act === "trust") {
    return [
      `Desire and confidence walk for ${brand}: ${name}.`,
      "Gentle camera follow, natural light, editorial lifestyle mood,",
      `brand feeling of ${brand}, no fake certificates, no review UI, no on-screen text.`,
    ].join(" ");
  }
  return [
    `Premium editorial hero video for ${brand}: ${name}.`,
    "Smooth 9:16 social cut, soft paper-and-ink atmosphere, fashion campaign energy,",
    `${brand} brand emphasis through mood and styling, no purple neon, no emoji, no on-screen text.`,
  ].join(" ");
}
