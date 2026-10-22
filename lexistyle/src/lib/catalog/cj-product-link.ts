/** CJ Dropshipping 원본 상품 페이지 URL · 팝업 */

export type CjProductLinkInput = {
  sourceUrl?: string | null;
  externalId?: string | null;
  supplierCode?: string | null;
};

/** crawl 시 저장된 sourceUrl 우선, 없으면 pid 패턴으로 생성 */
export function cjProductPageUrl(it: CjProductLinkInput): string | null {
  const stored = it.sourceUrl?.trim();
  if (stored) return stored;
  const pid = it.externalId?.trim();
  if (it.supplierCode === "cjdropshipping" && pid) {
    return `https://cjdropshipping.com/product/-p-${encodeURIComponent(pid)}.html`;
  }
  return null;
}

/** CJ 상품 상세를 중앙 팝업 창으로 연다 */
export function openCjProductPopup(it: CjProductLinkInput) {
  const url = cjProductPageUrl(it);
  if (!url || typeof window === "undefined") return;
  const w = Math.min(1100, Math.floor(window.screen.availWidth * 0.85));
  const h = Math.min(900, Math.floor(window.screen.availHeight * 0.9));
  const left = Math.max(0, Math.floor((window.screen.availWidth - w) / 2));
  const top = Math.max(0, Math.floor((window.screen.availHeight - h) / 2));
  const name = it.externalId ? `cj-product-${it.externalId}` : "cj-product";
  const popup = window.open(
    url,
    name,
    `popup=yes,width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );
  popup?.focus();
}
