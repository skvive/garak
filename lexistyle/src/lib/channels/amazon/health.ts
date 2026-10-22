import {
  amazonAuFullyConfigured,
  amazonAuListingMode,
  amazonAuLwaConfigured,
  amazonAuSigV4Configured,
  AMAZON_AU_MARKETPLACE_ID,
} from "./constants";
import { getMarketplaceParticipations } from "./sp-api";
import {
  readAmazonAuHealthSnapshot,
  writeAmazonAuHealthSnapshot,
  type AmazonAuHealthSnapshot,
  type AmazonHealthLevel,
} from "./health-state";

export type AmazonAuHealth = AmazonAuHealthSnapshot;

export function getAmazonAuHealthSnapshot(): AmazonAuHealthSnapshot {
  return readAmazonAuHealthSnapshot();
}

function syncBaseline(): AmazonAuHealthSnapshot {
  const cur = readAmazonAuHealthSnapshot();
  const lwa = amazonAuLwaConfigured();
  const sigv4 = amazonAuSigV4Configured();
  const sellerId = Boolean(process.env.AMAZON_AU_SELLER_ID?.trim());
  const listingMode = amazonAuListingMode();

  if (!lwa && !sellerId) {
    return {
      health: "mock",
      note: "Export 목업 · LWA/Seller ID 없음",
      marketplaceId: AMAZON_AU_MARKETPLACE_ID,
      listingMode,
      lwa,
      sigv4,
      sellerId,
      lastSuccessAt: cur.lastSuccessAt,
      lastError: cur.lastError,
    };
  }
  if (!sigv4 || !sellerId) {
    return {
      health: "ready",
      note: sigv4 ? "Seller ID 필요" : "AWS SigV4 키 필요 · LWA만 있음",
      marketplaceId: AMAZON_AU_MARKETPLACE_ID,
      listingMode,
      lwa,
      sigv4,
      sellerId,
      lastSuccessAt: cur.lastSuccessAt,
      lastError: cur.lastError,
    };
  }
  if (cur.lastSuccessAt && cur.health === "live") {
    return { ...cur, lwa, sigv4, sellerId, listingMode };
  }
  return {
    health: "ready",
    note: "자격증명 있음 · 연결 확인 필요",
    marketplaceId: AMAZON_AU_MARKETPLACE_ID,
    listingMode,
    lwa,
    sigv4,
    sellerId,
    lastSuccessAt: cur.lastSuccessAt,
    lastError: cur.lastError,
  };
}

/** A1 — marketplaceParticipations로 AU live 판정 */
export async function probeAmazonAuHealth(): Promise<AmazonAuHealthSnapshot> {
  const base = syncBaseline();
  if (base.health === "mock" || !amazonAuFullyConfigured()) {
    writeAmazonAuHealthSnapshot(base);
    return base;
  }
  try {
    const res = await getMarketplaceParticipations();
    const parts = res.data.payload?.marketplaceParticipations ?? [];
    const au = parts.find(
      (p) => p.marketplace?.id === AMAZON_AU_MARKETPLACE_ID && p.participation?.isParticipating !== false,
    );
    const next: AmazonAuHealthSnapshot = {
      ...base,
      health: au ? "live" : "ready",
      note: au ? `AU 참여 확인 · ${amazonAuListingMode()}` : "AU marketplace 미참여",
      auParticipating: Boolean(au),
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    };
    writeAmazonAuHealthSnapshot(next);
    return next;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const next: AmazonAuHealthSnapshot = {
      ...base,
      health: "ready",
      note: "SP-API 연결 실패",
      lastError: msg.slice(0, 240),
    };
    writeAmazonAuHealthSnapshot(next);
    return next;
  }
}

export function amazonAuEnvHealth(): { health: AmazonHealthLevel; note: string } {
  const s = readAmazonAuHealthSnapshot();
  return { health: s.health, note: s.note };
}
