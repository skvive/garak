export type StockAlert = "ok" | "low" | "out" | "unknown";

/** 크롤 리스트만 있을 때 — 창고 수량이 아님. 품절/부족으로 세지 않음 */
export const STOCK_UNKNOWN = -1;

export const STOCK_LOW_MAX = 10;

export type StockMeta = {
  stockVerified?: boolean;
  warehouses?: { name: string; qty: number }[];
};

/** rawMeta에서 실창고 검증 여부. 없으면 미확인(과거 listedNum 오분류 포함) */
export function isStockVerified(rawMeta: unknown): boolean {
  if (!rawMeta || typeof rawMeta !== "object") return false;
  return (rawMeta as StockMeta).stockVerified === true;
}

export function stockAlertOf(stock: number, rawMeta?: unknown): StockAlert {
  if (!isStockVerified(rawMeta) || stock < 0 || !Number.isFinite(stock)) return "unknown";
  if (stock <= 0) return "out";
  if (stock < STOCK_LOW_MAX) return "low";
  return "ok";
}

export const STOCK_ALERT_KO: Record<StockAlert, string> = {
  unknown: "미확인",
  out: "품절",
  low: "부족",
  ok: "정상",
};
