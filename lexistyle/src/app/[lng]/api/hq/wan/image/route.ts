import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { generateProductImage, imageProvider } from "@/lib/images/generate";
import { wanConfigured, wanHost, wanImageModel } from "@/lib/wan/config";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * Wan(또는 현재 IMAGE_PROVIDER)으로 마케팅 이미지 1장.
 * POST { productName, style?, size?, seed?, background?, replacePrompt?, catalogId? }
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let body: Parameters<typeof generateProductImage>[0];
  try {
    body = (await req.json()) as Parameters<typeof generateProductImage>[0];
  } catch {
    return bad("invalid json");
  }
  if (!body.productName?.trim()) return bad("productName required");

  try {
    const result = await generateProductImage({
      ...body,
      supplierCode: body.supplierCode ?? "wan-marketing",
    });
    return NextResponse.json({
      ok: true,
      provider: result.source.provider,
      mock: result.mock,
      source: result.source,
      assets: result.assets,
      wanConfigured: wanConfigured(),
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "wan image failed", 502);
  }
}

export async function GET() {
  const provider = imageProvider();
  return NextResponse.json({
    ok: true,
    configured: wanConfigured(),
    host: wanHost(),
    imageModel: wanImageModel(),
    activeProvider: provider.code,
  });
}
