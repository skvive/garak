/** CJ 상세 URL. `/product/{pid}.html` 는 삭제 페이지로 떨어진다. 정본은 `-p-{pid}`. */
export function cjProductPageUrl(sourceUrl: string | null | undefined, externalId: string): string {
  const pid = cjPid(externalId, sourceUrl);
  const src = sourceUrl?.trim() ?? "";
  if (pid && /\/product\/[^/]*-p-\d+/i.test(src)) {
    return src.startsWith("http") ? src : `https://cjdropshipping.com${src.startsWith("/") ? "" : "/"}${src}`;
  }
  if (pid) return `https://cjdropshipping.com/product/-p-${pid}.html`;
  if (/^https?:\/\//i.test(src)) return src;
  return `https://cjdropshipping.com/product/${encodeURIComponent(externalId)}.html`;
}

export function cjPid(externalId: string, sourceUrl?: string | null): string {
  const fromUrl = sourceUrl?.match(/-p-(\d+)/i)?.[1];
  if (fromUrl) return fromUrl;
  const first = String(externalId).split(/[/?#]/)[0] ?? "";
  const digits = first.replace(/\D/g, "");
  return digits;
}
