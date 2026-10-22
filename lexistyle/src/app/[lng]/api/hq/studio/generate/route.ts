import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { generatePdpText } from "@/lib/pdp/text-generate";
import { renderPdp, toBlocks } from "@/lib/pdp/generate";
import { getCatalogById } from "@/lib/catalog/index-store";
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import { defaultConceptSpec } from "@/lib/pdp/concept-spec";
import { generateMarketingAssets } from "@/lib/pdp/marketing-images";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * 스튜디오 프리폼 생성 — linkrcode Phase 2 + HQ 시드 주입 (Phase A).
 * catalogId가 있으면 getCatalogById로 title·가격·카테고리·thumb를 채운다.
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid json");
  }

  const catalogId = b.catalogId != null ? Number(b.catalogId) : null;
  let productName = String(b.productName ?? "").trim();
  let category = b.category ? String(b.category) : "Lifestyle";
  let price = b.price ? String(b.price) : "USD 0";
  let seller = b.seller ? String(b.seller) : undefined;
  let description = b.description ? String(b.description) : undefined;
  const conceptSpec = (b.conceptSpec as ConceptSpec | undefined) ?? (catalogId ? defaultConceptSpec(catalogId) : undefined);

  if (catalogId && Number.isFinite(catalogId)) {
    const row = await getCatalogById(catalogId);
    if (!row) return bad("catalog item not found", 404);
    productName = productName || row.title;
    category = row.categoryPath?.slice(-1)?.[0] ?? category;
    price = `${row.currency} ${row.minPrice ?? "0"}`;
    seller = row.sellerName ?? seller;
    if (row.primaryThumbUrl) {
      b.imageUrls = [row.primaryThumbUrl, ...(Array.isArray(b.imageUrls) ? (b.imageUrls as string[]) : [])];
    }
  }

  if (!productName) return bad("productName or catalogId required");

  let assetUrls: string[] = Array.isArray(b.imageUrls) ? (b.imageUrls as string[]).filter(Boolean) : [];
  let imageMock = false;

  const styleOverride =
    conceptSpec?.imageRecipe?.style ?? (b.style ? String(b.style) : undefined);
  const genImage = Boolean(b.generateImage ?? conceptSpec?.imageRecipe?.generate);

  let imageError: string | null = null;
  if (genImage) {
    const existingUrls = assetUrls.length > 0 ? assetUrls : undefined;
    const marketing = await generateMarketingAssets({
      productName,
      category,
      styleOverride,
      backgroundPolicy:
        conceptSpec?.imageRecipe?.backgroundPolicy ??
        (b.background as "keep" | "remove" | "replace") ??
        "keep",
      replacePrompt:
        conceptSpec?.imageRecipe?.replacePrompt ??
        (b.replacePrompt ? String(b.replacePrompt) : undefined),
      supplierCode: catalogId ? "hq-studio" : "linkrcode-studio",
      catalogId: catalogId ?? undefined,
      existingUrls,
    });
    imageMock = marketing.imageMock;
    imageError = marketing.imageError;
    // mock 폴백 시 existingUrls가 그대로 반환되므로 중복 제거
    if (marketing.urls.length) {
      const newUrls = marketing.urls.filter((u) => !assetUrls.includes(u));
      if (newUrls.length) assetUrls = [...newUrls, ...assetUrls];
    }
  }

  try {
    const locale = conceptSpec?.locale ?? (b.locale ? String(b.locale) : "ko");
    const { doc, engine, model } = await generatePdpText({
      title: productName,
      category,
      price,
      seller,
      description,
      locale,
      assetUrls,
      voice: conceptSpec?.voice,
      copyRuleset: conceptSpec?.copyRuleset,
    });
    const html = renderPdp(doc, assetUrls, conceptSpec);
    const blocks = toBlocks(doc, assetUrls, conceptSpec);
    return NextResponse.json({
      ok: true,
      engine,
      model: model ?? null,
      imageMock,
      imageError,
      catalogId: catalogId ?? null,
      conceptSpec: conceptSpec ?? null,
      structured: doc,
      blocks,
      assetUrls,
      html,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "generation failed", 500);
  }
}
