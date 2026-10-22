/** 판매채널 표시명·배지. 칩 목록은 API `channels`가 정본. */
export const CHANNEL_LABELS: Record<string, string> = {
  coupang: "Coupang",
  shopify: "Shopify",
  amazon_au: "Amazon AU",
  cafe24: "Cafe24",
  lexi: "LEXISTYLE",
  shopee: "Shopee",
  instagram: "Instagram",
  tiktok: "TikTok",
  naver: "Naver",
  youtube: "YouTube",
};

export const CHANNEL_PILL: Record<string, string> = {
  coupang: "bg-gold/15 text-gold",
  shopify: "bg-sage/15 text-sage",
  amazon_au: "bg-coral/15 text-coral",
  cafe24: "bg-ink/10 text-ink",
  lexi: "bg-fog text-ink",
  shopee: "bg-gold/10 text-ink",
  instagram: "bg-coral/10 text-coral",
  tiktok: "bg-ink/10 text-ink",
  naver: "bg-sage/15 text-sage",
  youtube: "bg-coral/15 text-coral",
};

export function channelLabel(code: string) {
  return CHANNEL_LABELS[code] ?? code;
}

export function channelPill(code: string) {
  return CHANNEL_PILL[code] ?? "bg-fog text-dim";
}
