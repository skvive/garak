import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { listProviders, refreshProviderMeta } from "@/lib/catalog/providers";
import { SOURCING_PLATFORMS, type SourcingPlatformCode } from "@/lib/sourcing/platforms";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asPlatform(v: unknown): SourcingPlatformCode {
  const code = String(v ?? "cjdropshipping");
  return SOURCING_PLATFORMS.some((p) => p.code === code) ? (code as SourcingPlatformCode) : "cjdropshipping";
}

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const platform = asPlatform(new URL(req.url).searchParams.get("platform"));
  const data = await listProviders(platform);
  return NextResponse.json({
    platforms: SOURCING_PLATFORMS,
    platform: data.platform,
    providers: data.providers,
  });
}

export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { platform?: string };
  const platform = asPlatform(body.platform);
  if (!SOURCING_PLATFORMS.find((p) => p.code === platform)?.connected) {
    return bad("platform not connected");
  }
  const result = await refreshProviderMeta(platform);
  const data = await listProviders(platform);
  return NextResponse.json({ ...result, platform: data.platform, providers: data.providers });
}
