/** Amazon AU SP-API — Far East region (Australia marketplace) */
export const AMAZON_AU_MARKETPLACE_ID = process.env.AMAZON_AU_MARKETPLACE_ID?.trim() || "A39IBJ37TRP1C6";
export const AMAZON_AU_SP_API_HOST = "sellingpartnerapi-fe.amazon.com";
export const AMAZON_AU_SP_API_BASE = `https://${AMAZON_AU_SP_API_HOST}`;
export const AMAZON_AU_SIGV4_REGION = process.env.AMAZON_AU_AWS_REGION?.trim() || "us-west-2";

export function amazonAuLwaConfigured() {
  return Boolean(
    process.env.AMAZON_AU_CLIENT_ID &&
      process.env.AMAZON_AU_CLIENT_SECRET &&
      process.env.AMAZON_AU_REFRESH_TOKEN,
  );
}

export function amazonAuSigV4Configured() {
  return Boolean(process.env.AMAZON_AU_AWS_ACCESS_KEY && process.env.AMAZON_AU_AWS_SECRET_KEY);
}

export function amazonAuSellerId() {
  return process.env.AMAZON_AU_SELLER_ID?.trim() || "";
}

/** preview = VALIDATION_PREVIEW only; live = real PUT (default preview until env set) */
export function amazonAuListingMode(): "preview" | "live" {
  const m = process.env.AMAZON_AU_LISTING_MODE?.trim().toLowerCase();
  return m === "live" ? "live" : "preview";
}

export function amazonAuFullyConfigured() {
  return amazonAuLwaConfigured() && amazonAuSigV4Configured() && Boolean(amazonAuSellerId());
}
