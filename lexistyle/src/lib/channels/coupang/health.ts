import {
  coupangFulfillmentConfigured,
  coupangKeysConfigured,
  coupangRelayUrl,
  coupangVendorId,
} from "./constants";
import { listAcceptOrdersheets } from "./client";
import {
  readCoupangHealthSnapshot,
  writeCoupangHealthSnapshot,
  type CoupangHealthLevel,
  type CoupangHealthSnapshot,
} from "./health-state";

export function getCoupangHealthSnapshot(): CoupangHealthSnapshot {
  const next = syncBaseline();
  writeCoupangHealthSnapshot(next);
  return next;
}

function syncBaseline(): CoupangHealthSnapshot {
  const cur = readCoupangHealthSnapshot();
  const keys = coupangKeysConfigured();
  const fulfillment = coupangFulfillmentConfigured();
  const relay = Boolean(coupangRelayUrl());
  const vendorId = coupangVendorId();

  if (!keys) {
    return {
      health: "mock",
      note: "Export 목업 · ACCESS_KEY/VENDOR 없음",
      vendorId,
      keys,
      fulfillment,
      relay,
      lastSuccessAt: cur.lastSuccessAt,
      lastError: cur.lastError,
    };
  }
  if (cur.lastSuccessAt && cur.health === "live") {
    return { ...cur, keys, fulfillment, relay, vendorId };
  }
  return {
    health: "ready",
    note: fulfillment ? "자격증명 있음 · 연결 확인 필요" : "출고지/반품지/택배사 env 미완",
    vendorId,
    keys,
    fulfillment,
    relay,
    lastSuccessAt: cur.lastSuccessAt,
    lastError: cur.lastError,
  };
}

export async function probeCoupangHealth(): Promise<CoupangHealthSnapshot> {
  const base = syncBaseline();
  if (base.health === "mock" || !coupangKeysConfigured()) {
    writeCoupangHealthSnapshot(base);
    return base;
  }
  try {
    await listAcceptOrdersheets();
    const next: CoupangHealthSnapshot = {
      ...base,
      health: "live",
      note: `Wing Open API · vendor ${coupangVendorId()}${coupangRelayUrl() ? " · relay" : ""}`,
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    };
    writeCoupangHealthSnapshot(next);
    return next;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const next: CoupangHealthSnapshot = {
      ...base,
      health: "ready",
      note: "Wing API 연결 실패",
      lastError: msg.slice(0, 240),
    };
    writeCoupangHealthSnapshot(next);
    return next;
  }
}

export function coupangEnvHealth(): { health: CoupangHealthLevel; note: string } {
  const s = syncBaseline();
  return { health: s.health, note: s.note };
}
