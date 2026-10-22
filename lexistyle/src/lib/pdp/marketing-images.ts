import { imageProvider, generateProductImage } from "@/lib/images/generate";
import type { ImageSize } from "@/lib/images/types";
import { buildMarketingImagePlan } from "@/lib/pdp/marketing-prompt";

function mapPlanSize(size: "portrait" | "square" | "landscape"): ImageSize {
  return size;
}

export async function generateMarketingAssets(input: {
  productName: string;
  category?: string;
  styleOverride?: string;
  backgroundPolicy?: "keep" | "remove" | "replace";
  replacePrompt?: string;
  supplierCode?: string;
  catalogId?: number;
  /** CJ 크롤링 등 기존 원본 이미지 URL — mock provider만 있을 때 AI 생성 대신 사용 */
  existingUrls?: string[];
}): Promise<{ urls: string[]; imageMock: boolean; imageError: string | null }> {
  // mock provider만 있고 existingUrls가 있으면 실제 이미지 생성 스킵
  const prov = imageProvider();
  if (prov.code === "mock" && input.existingUrls?.length) {
    const urls = input.existingUrls.length >= 3
      ? input.existingUrls.slice(0, 3)
      : [
          input.existingUrls[0],
          input.existingUrls[0],
          input.existingUrls[0],
        ];
    return { urls, imageMock: false, imageError: null };
  }

  const plan = buildMarketingImagePlan({
    title: input.productName,
    category: input.category,
  });

  if (input.styleOverride) {
    const hero = plan.find((p) => p.role === "hero");
    if (hero) hero.prompt = input.styleOverride;
  }

  const urls: string[] = [];
  let imageMock = false;
  let imageError: string | null = null;

  for (const recipe of plan) {
    try {
      const gen = await generateProductImage({
        productName: input.productName,
        style: recipe.prompt,
        background: input.backgroundPolicy ?? "keep",
        replacePrompt: input.replacePrompt,
        supplierCode: input.supplierCode,
        catalogId: input.catalogId,
        externalId: input.catalogId != null ? `${input.catalogId}-${recipe.role}` : undefined,
        size: mapPlanSize(recipe.size),
      });
      if (recipe.role === "hero") imageMock = gen.mock;
      const url = gen.assets.find((a) => a.variant === "pdp")?.url ?? gen.assets[0]?.url;
      if (url) urls.push(url);
    } catch (e) {
      if (recipe.role === "hero") {
        imageError = e instanceof Error ? e.message : "image generation failed";
        imageMock = true;
      }
    }
  }

  return { urls, imageMock, imageError };
}
