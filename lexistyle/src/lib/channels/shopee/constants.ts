/** Shopee Open Platform v2 — SEA shop (CNSC KR portal, 1호 SG) */
export const SHOPEE_LIVE_HOST = "https://partner.shopeemobile.com";
export const SHOPEE_SANDBOX_HOST = "https://partner.test-stable.shopeemobile.com";

export function shopeeHost() {
  return process.env.SHOPEE_REGION === "sandbox" ? SHOPEE_SANDBOX_HOST : SHOPEE_LIVE_HOST;
}

export function shopeePartnerId() {
  const value = process.env.SHOPEE_PARTNER_ID?.trim() || "";
  return /^\d+$/.test(value) ? value : "";
}

export function shopeeShopId() {
  const value = process.env.SHOPEE_SHOP_ID?.trim() || "";
  return /^\d+$/.test(value) ? value : "";
}

export function shopeeCurrency() {
  return process.env.SHOPEE_CURRENCY?.trim() || "SGD";
}

export function shopeeListingMode(): "preview" | "live" {
  return process.env.SHOPEE_LISTING_MODE?.trim().toLowerCase() === "live" ? "live" : "preview";
}

export function shopeePartnerConfigured() {
  return Boolean(shopeePartnerId() && process.env.SHOPEE_PARTNER_KEY?.trim());
}

export function shopeeTokenConfigured() {
  return Boolean(process.env.SHOPEE_ACCESS_TOKEN?.trim() || process.env.SHOPEE_REFRESH_TOKEN?.trim());
}

export function shopeeShopConfigured() {
  return Boolean(shopeeShopId());
}

export function shopeeFullyConfigured() {
  return shopeePartnerConfigured() && shopeeShopConfigured() && shopeeTokenConfigured();
}

export function shopeeDefaultCategoryId() {
  return Number(process.env.SHOPEE_CATEGORY_ID ?? 0) || 0;
}

export function shopeeDefaultLogisticId() {
  return Number(process.env.SHOPEE_LOGISTIC_ID ?? 0) || 0;
}
