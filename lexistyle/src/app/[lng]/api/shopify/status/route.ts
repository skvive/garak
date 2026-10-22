// filepath: src/app/api/shopify/status/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || null;
  const hasAccessToken = Boolean(process.env.SHOPIFY_ACCESS_TOKEN);
  const hasClientCredentials = Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);
  const configured = Boolean(storeDomain && (hasAccessToken || hasClientCredentials));

  return NextResponse.json({
    configured,
    storeDomain,
    authMode: hasAccessToken ? "legacy_token" : hasClientCredentials ? "client_credentials" : "none",
    apiVersion: process.env.SHOPIFY_API_VERSION || "2024-10",
    currency: process.env.SHOPIFY_CURRENCY || "USD",
  });
}
