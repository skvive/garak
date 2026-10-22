/** Coupang Wing Open API — HMAC CEA */
export const COUPANG_API_HOST = "https://api-gateway.coupang.com";

export function coupangVendorId() {
  return process.env.COUPANG_VENDOR_ID?.trim() || "";
}

export function coupangRelayUrl() {
  return process.env.COUPANG_RELAY_URL?.trim().replace(/\/$/, "") || "";
}

export function coupangDeliveryCompanyCode() {
  return process.env.COUPANG_DELIVERY_COMPANY_CODE?.trim() || "";
}

export function coupangKeysConfigured() {
  return Boolean(process.env.COUPANG_ACCESS_KEY?.trim() && process.env.COUPANG_SECRET_KEY?.trim() && coupangVendorId());
}

export function coupangFulfillmentConfigured() {
  return Boolean(
    process.env.COUPANG_RETURN_CENTER_CODE?.trim() &&
      process.env.COUPANG_OUTBOUND_SHIPPING_PLACE_CODE?.trim() &&
      coupangDeliveryCompanyCode(),
  );
}

export function coupangFullyConfigured() {
  return coupangKeysConfigured() && coupangFulfillmentConfigured();
}

/** 해외배송 정책은 env로 조정할 수 있지만, LEXI 기본 정책은 24,000원이다. */
export function coupangDeliveryCharge() {
  const value = Number(process.env.COUPANG_DELIVERY_CHARGE || 24000);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 24000;
}

export function coupangReturnShippingFee() {
  const value = Number(process.env.COUPANG_RETURN_SHIPPING_FEE || 24000);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 24000;
}
