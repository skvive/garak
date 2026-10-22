// filepath: src/lib/cafe24/config.ts
/**
 * Cafe24 Open API (헤드리스) 설정.
 * 카페24는 오픈소스 백엔드가 아니라 SaaS API — mall + 앱 키로 연동.
 */
export function cafe24Configured() {
  return Boolean(
    process.env.CAFE24_MALL_ID?.trim() &&
      process.env.CAFE24_FRONT_CLIENT_ID?.trim() &&
      (process.env.CAFE24_FRONT_API_KEY?.trim() ||
        process.env.CAFE24_ACCESS_TOKEN?.trim() ||
        process.env.CAFE24_CLIENT_SECRET?.trim()), // OAuth 연결 가능
  );
}

/** OAuth 원클릭 연결 가능 여부 (Client Secret 보유) */
export function cafe24OAuthConfigured() {
  return Boolean(
    process.env.CAFE24_MALL_ID?.trim() &&
      process.env.CAFE24_FRONT_CLIENT_ID?.trim() &&
      process.env.CAFE24_CLIENT_SECRET?.trim(),
  );
}

export function cafe24ClientSecret() {
  return process.env.CAFE24_CLIENT_SECRET!.trim();
}

/**
 * 조회 권한 스코프.
 * 기본값은 카탈로그(/products, /products/{no})에 실제로 필요한 최소 권한인
 * mall.read_product 하나만 요청한다. 카테고리·진열·주문까지 다루려면
 * CAFE24_SCOPES에 mall.read_category 등을 콤마로 추가한다.
 * (요청 scope가 개발자센터 앱에 등록된 권한과 하나라도 다르면 invalid_scope 발생)
 */
export function cafe24Scopes(): string[] {
  const s = process.env.CAFE24_SCOPES?.trim();
  if (s) return s.split(",").map((x) => x.trim()).filter(Boolean);
  return ["mall.read_product"];
}

export const CAFE24_REDIRECT_PATH = "/api/cafe24/oauth/callback";

export function cafe24AdminConfigured() {
  return Boolean(
    process.env.CAFE24_MALL_ID?.trim() && process.env.CAFE24_ACCESS_TOKEN?.trim(),
  );
}

export function cafe24Mode(): "off" | "front" | "hybrid" {
  if (!cafe24Configured()) return "off";
  const m = (process.env.CAFE24_MODE || "front").toLowerCase();
  if (m === "hybrid" || m === "sync") return "hybrid";
  if (m === "off") return "off";
  return "front";
}

export function cafe24MallId() {
  return process.env.CAFE24_MALL_ID!.trim();
}

export function cafe24ShopNo() {
  return Number(process.env.CAFE24_SHOP_NO || 1);
}

export function cafe24ApiVersion() {
  return process.env.CAFE24_API_VERSION?.trim() || "2026-03-01";
}

export function cafe24BaseUrl() {
  return `https://${cafe24MallId()}.cafe24api.com/api/v2`;
}

/** USD 표시용: Cafe24 price(보통 KRW) → USD */
export function cafe24KrwToUsd(krw: number) {
  const rate = Number(process.env.USD_KRW_RATE || 1350);
  return +(krw / rate).toFixed(2);
}

export function cafe24StatusPayload() {
  return {
    mode: cafe24Mode(),
    configured: cafe24Configured(),
    adminConfigured: cafe24AdminConfigured(),
    oauthConfigured: cafe24OAuthConfigured(),
    mallId: process.env.CAFE24_MALL_ID?.trim() || null,
    shopNo: cafe24ShopNo(),
    apiVersion: cafe24ApiVersion(),
    note:
      cafe24Configured()
        ? "Cafe24 API active — catalog prefers Cafe24"
        : "Set CAFE24_MALL_ID + CAFE24_FRONT_CLIENT_ID + CAFE24_CLIENT_SECRET",
  };
}
