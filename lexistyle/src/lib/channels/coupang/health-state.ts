/** Wing API 스냅샷 — health ↔ client 순환 import 방지 */
import { coupangVendorId } from "./constants";

export type CoupangHealthLevel = "live" | "ready" | "mock" | "off" | "paused";

export type CoupangHealthSnapshot = {
  health: CoupangHealthLevel;
  note: string;
  vendorId: string;
  keys: boolean;
  fulfillment: boolean;
  relay: boolean;
  lastSuccessAt?: string;
  lastError?: string;
};

let snapshot: CoupangHealthSnapshot = {
  health: "mock",
  note: "키 없음 · Export 목업",
  vendorId: "",
  keys: false,
  fulfillment: false,
  relay: false,
};

export function readCoupangHealthSnapshot(): CoupangHealthSnapshot {
  return { ...snapshot, vendorId: coupangVendorId() || snapshot.vendorId };
}

export function writeCoupangHealthSnapshot(next: CoupangHealthSnapshot) {
  snapshot = next;
}

export function markCoupangApiSuccess(path: string) {
  snapshot = {
    ...snapshot,
    lastSuccessAt: new Date().toISOString(),
    lastError: undefined,
    note: snapshot.health === "live" ? `Wing API ok · ${path}` : snapshot.note,
  };
}

export function markCoupangApiFailure(err: string) {
  snapshot = { ...snapshot, lastError: err.slice(0, 240) };
}
