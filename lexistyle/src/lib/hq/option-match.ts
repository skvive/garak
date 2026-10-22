/** 채널 주문 옵션 → 공급처(CJ) variant 선택. 채널 SKU(=CJ vid)가 최우선, 다옵션인데 못 찾으면 오발주 방지로 undefined */
export type SupplyOptionCandidate = { sku?: string; name: string; key?: string; attributes?: Record<string, string> };

export const normOption = (v: string) => v.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

export function pickSupplyOption<T extends SupplyOptionCandidate>(
  options: T[],
  optionLabel?: string,
  variantSku?: string,
): T | undefined {
  const usable = options.filter((o) => o.sku);
  if (variantSku) {
    const bySku = usable.find((o) => o.sku === variantSku);
    if (bySku) return bySku;
  }
  const want = optionLabel ? normOption(optionLabel) : "";
  if (want) {
    const labels = (o: T) =>
      [o.key, o.name, o.attributes?.variant].filter((x): x is string => Boolean(x)).map(normOption);
    const hit =
      usable.find((o) => labels(o).includes(want) || o.sku === optionLabel) ??
      usable.find((o) => labels(o).some((l) => l.endsWith(want)));
    if (hit) return hit;
  }
  return usable.length === 1 ? usable[0] : undefined;
}
