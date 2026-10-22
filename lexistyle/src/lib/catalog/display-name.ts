/** CJ 원문 상품명 → 스토어프론트 표시명. 도매·플랫폼 홍보 문구를 걷어내고 길이를 제한한다. */

const NOISE = [
  /cross[- ]?border/gi,
  /hot[- ]?sell(?:ing)?/gi,
  /best[- ]?sell(?:ing|er)?/gi,
  /new (?:arrival|style|fashion)s?/gi,
  /\bwholesale\b/gi,
  /\bamazon\b/gi,
  /\bindependent station\b/gi,
  /\b(?:ali)?express\b/gi,
  /european and american/gi,
  /\b(?:in stock|3c certified|factory direct|one[- ]?piece dropshipping|drop ?shipping)\b/gi,
  /\b(?:autumn|spring|summer|winter)( and (?:autumn|spring|summer|winter))?\b/gi,
];

const MAX_LEN = 80;

export function cleanProductName(raw: string): string {
  let s = raw;
  for (const re of NOISE) s = s.replace(re, " ");
  s = s
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/^[\s,.;:\-–]+|[\s,.;:\-–]+$/g, "");
  // 노이즈 제거 후 너무 짧아지면 원문 유지
  if (s.length < 8) s = raw.trim();
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const at = Math.max(cut.lastIndexOf(","), cut.lastIndexOf(" "));
    s = (at > 40 ? cut.slice(0, at) : cut).replace(/[\s,.;:\-–]+$/g, "");
  }
  return s;
}

/** 제네릭 소싱 브랜드는 표시용으로 LEXI 로 통일 */
export function displayBrand(brand: string): string {
  return /^lexi\s+sourc/i.test(brand.trim()) ? "LEXI" : brand;
}
