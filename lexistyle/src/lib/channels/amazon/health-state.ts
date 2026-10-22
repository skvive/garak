/** SP-API 호출 결과 스냅샷 — health ↔ sp-api 순환 import 방지 */
import { AMAZON_AU_MARKETPLACE_ID, amazonAuListingMode } from "./constants";

export type AmazonHealthLevel = "live" | "ready" | "mock" | "off" | "paused";

export type AmazonAuHealthSnapshot = {
  health: AmazonHealthLevel;
  note: string;
  marketplaceId: string;
  listingMode: "preview" | "live";
  lwa: boolean;
  sigv4: boolean;
  sellerId: boolean;
  auParticipating?: boolean;
  lastSuccessAt?: string;
  lastError?: string;
};

let snapshot: AmazonAuHealthSnapshot = {
  health: "mock",
  note: "키 없음 · Export 목업",
  marketplaceId: AMAZON_AU_MARKETPLACE_ID,
  listingMode: amazonAuListingMode(),
  lwa: false,
  sigv4: false,
  sellerId: false,
};

export function readAmazonAuHealthSnapshot(): AmazonAuHealthSnapshot {
  return { ...snapshot, listingMode: amazonAuListingMode() };
}

export function writeAmazonAuHealthSnapshot(next: AmazonAuHealthSnapshot) {
  snapshot = next;
}

export function markAmazonAuApiSuccess(path: string) {
  snapshot = {
    ...snapshot,
    lastSuccessAt: new Date().toISOString(),
    lastError: undefined,
    note: snapshot.health === "live" ? `SP-API ok · ${path}` : snapshot.note,
  };
}

export function markAmazonAuApiFailure(err: string) {
  snapshot = { ...snapshot, lastError: err.slice(0, 240) };
}
