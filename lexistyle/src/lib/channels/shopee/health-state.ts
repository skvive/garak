/** Shopee API 스냅샷 — health ↔ api 순환 import 방지 */
import { shopeeListingMode, shopeeShopId } from "./constants";

export type ShopeeHealthLevel = "live" | "ready" | "mock" | "off" | "paused";

export type ShopeeHealthSnapshot = {
  health: ShopeeHealthLevel;
  note: string;
  shopId: string;
  listingMode: "preview" | "live";
  partner: boolean;
  shop: boolean;
  token: boolean;
  region?: string;
  shopName?: string;
  lastSuccessAt?: string;
  lastError?: string;
};

let snapshot: ShopeeHealthSnapshot = {
  health: "mock",
  note: "키 없음 · Export 목업",
  shopId: shopeeShopId(),
  listingMode: shopeeListingMode(),
  partner: false,
  shop: false,
  token: false,
};

export function readShopeeHealthSnapshot(): ShopeeHealthSnapshot {
  return { ...snapshot, listingMode: shopeeListingMode(), shopId: shopeeShopId() };
}

export function writeShopeeHealthSnapshot(next: ShopeeHealthSnapshot) {
  snapshot = next;
}

export function markShopeeApiSuccess(path: string) {
  snapshot = {
    ...snapshot,
    lastSuccessAt: new Date().toISOString(),
    lastError: undefined,
    note: snapshot.health === "live" ? `Open API ok · ${path}` : snapshot.note,
  };
}

export function markShopeeApiFailure(err: string) {
  snapshot = { ...snapshot, lastError: err.slice(0, 240) };
}
