import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { generateProductImage, type GenerateProductImageInput } from "@/lib/images/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI 상품 이미지 생성 — linkrcode Phase 1.
 * POST { productName, style?, size?, seed?, background?, replacePrompt?,
 *        supplierCode?, externalId?, catalogId?, variants? }
 * 인증: HQ (Bearer HQ_API_TOKEN 또는 관리자 세션). FAL_KEY 미설정 시 mock 폴백.
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let body: GenerateProductImageInput;
  try {
    body = (await req.json()) as GenerateProductImageInput;
  } catch {
    return bad("invalid json");
  }
  if (!body.productName?.trim()) return bad("productName required");
  try {
    const result = await generateProductImage(body);
    return NextResponse.json({
      ok: true,
      mock: result.mock,
      source: result.source,
      assets: result.assets,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "image generation failed", 502);
  }
}
