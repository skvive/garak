import {
  shopeeFullyConfigured,
  shopeeListingMode,
  shopeePartnerConfigured,
  shopeeShopConfigured,
  shopeeShopId,
  shopeeTokenConfigured,
} from "./constants";
import { getChannelList, getShopInfo } from "./api";
import {
  readShopeeHealthSnapshot,
  writeShopeeHealthSnapshot,
  type ShopeeHealthLevel,
  type ShopeeHealthSnapshot,
} from "./health-state";

export function getShopeeHealthSnapshot(): ShopeeHealthSnapshot {
  const next = syncBaseline();
  writeShopeeHealthSnapshot(next);
  return next;
}

function syncBaseline(): ShopeeHealthSnapshot {
  const cur = readShopeeHealthSnapshot();
  const partner = shopeePartnerConfigured();
  const shop = shopeeShopConfigured();
  const token = shopeeTokenConfigured();
  const listingMode = shopeeListingMode();
  const shopId = shopeeShopId();

  if (!partner && !shop) {
    return {
      health: "mock",
      note: "Export 목업 · Partner/Shop 없음",
      shopId,
      listingMode,
      partner,
      shop,
      token,
      lastSuccessAt: cur.lastSuccessAt,
      lastError: cur.lastError,
    };
  }
  if (!token || !shop) {
    return {
      health: "ready",
      note: shop ? "access/refresh token 필요" : "SHOPEE_SHOP_ID 필요",
      shopId,
      listingMode,
      partner,
      shop,
      token,
      lastSuccessAt: cur.lastSuccessAt,
      lastError: cur.lastError,
    };
  }
  if (cur.lastSuccessAt && cur.health === "live") {
    return { ...cur, partner, shop, token, listingMode, shopId };
  }
  return {
    health: "ready",
    note: "자격증명 있음 · 연결 확인 필요",
    shopId,
    listingMode,
    partner,
    shop,
    token,
    lastSuccessAt: cur.lastSuccessAt,
    lastError: cur.lastError,
  };
}

export async function probeShopeeHealth(): Promise<ShopeeHealthSnapshot> {
  const base = syncBaseline();
  if (base.health === "mock" || !shopeeFullyConfigured()) {
    writeShopeeHealthSnapshot(base);
    return base;
  }
  try {
    const shop = await getShopInfo();
    let logisticNote = "";
    try {
      const ch = await getChannelList();
      const enabled = (ch.logistics_channel_list ?? []).filter((c) => c.enabled);
      logisticNote = enabled[0]?.logistic_id ? ` · logistic ${enabled[0].logistic_id}` : "";
    } catch {
      logisticNote = " · 물류 채널 조회 실패";
    }
    const next: ShopeeHealthSnapshot = {
      ...base,
      health: "live",
      note: `${shop.shop_name ?? "shop"} · ${shop.region ?? "SEA"}${logisticNote} · ${shopeeListingMode()}`,
      region: shop.region,
      shopName: shop.shop_name,
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    };
    writeShopeeHealthSnapshot(next);
    return next;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const next: ShopeeHealthSnapshot = {
      ...base,
      health: "ready",
      note: "Open API 연결 실패",
      lastError: msg.slice(0, 240),
    };
    writeShopeeHealthSnapshot(next);
    return next;
  }
}

export function shopeeEnvHealth(): { health: ShopeeHealthLevel; note: string } {
  const s = readShopeeHealthSnapshot();
  return { health: s.health, note: s.note };
}
