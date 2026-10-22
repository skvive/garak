// filepath: src/lib/images/generate.ts
import { optimizeAndStore, type AssetVariant } from "@/lib/catalog/assets";
import type { GeneratedImage, ImageProvider, ImageSize } from "./types";
import { falConfigured, falImageProvider } from "./providers/fal";
import { openaiConfigured, openaiImageProvider } from "./providers/openai";
import { wanConfigured, wanImageProvider } from "./providers/wan";
import { mockImageProvider } from "./providers/mock";
import { comfyuiImageProvider } from "./providers/comfyui";

/**
 * 이미지 생성 오케스트레이터 — linkrcode Phase 1.
 * 프로바이더 선택(comfyui → wan → openai → fal → mock) → 생성/편집 → optimizeAndStore로 WebP 변형 저장.
 * 반환된 optimizedUrl(pdp/card/thumb)은 designDoc의 assets[]에 그대로 바인딩된다.
 * IMAGE_PROVIDER=comfyui|wan|openai|fal|mock 으로 강제 지정 가능(미지정 시 comfyui 우선).
 */

export function comfyuiConfigured() {
  return true; // ComfyUI는 항상 시도 (로컬 서버 실행 여부는 런타임에 판단)
}

/**
 * 이미지 생성 오케스트레이터 — linkrcode Phase 1.
 * 프로바이더 선택(wan → openai → fal → mock) → 생성/편집 → optimizeAndStore로 WebP 변형 저장.
 * 반환된 optimizedUrl(pdp/card/thumb)은 designDoc의 assets[]에 그대로 바인딩된다.
 * IMAGE_PROVIDER=wan|openai|fal|mock 으로 강제 지정 가능(미지정 시 wan 우선).
 */

export function imageProvider(): ImageProvider {
  const forced = process.env.IMAGE_PROVIDER?.trim();
  if (forced === "comfyui") return comfyuiImageProvider;
  if (forced === "mock") return mockImageProvider;
  if (forced === "wan") return wanConfigured() ? wanImageProvider : mockImageProvider;
  if (forced === "openai") return openaiConfigured() ? openaiImageProvider : mockImageProvider;
  if (forced === "fal") return falConfigured() ? falImageProvider : mockImageProvider;
  if (comfyuiConfigured()) return comfyuiImageProvider;
  if (wanConfigured()) return wanImageProvider;
  if (openaiConfigured()) return openaiImageProvider;
  if (falConfigured()) return falImageProvider;
  return mockImageProvider;
}

export type GenerateProductImageInput = {
  /** 상품 컨텍스트 — 프롬프트 조립용 */
  productName: string;
  style?: string; // "미니멀 스튜디오, 부드러운 그림자"
  size?: ImageSize;
  seed?: number;
  /** 배경 정책: 생성 후처리 */
  background?: "keep" | "remove" | "replace";
  replacePrompt?: string; // background=replace 일 때 Kontext 지시
  /** 저장 메타 (assets 캐시 키) */
  supplierCode?: string;
  externalId?: string;
  catalogId?: number | null;
  variants?: AssetVariant[];
};

export type GeneratedProductImage = {
  source: GeneratedImage;
  /** optimizeAndStore 결과 (WebP 변형별 URL) */
  assets: { variant: AssetVariant; url: string; bytes: number; hash: string }[];
  mock: boolean;
};

function buildPrompt(input: GenerateProductImageInput): string {
  const style = input.style?.trim() || "clean studio product photography, soft shadow, high detail, e-commerce";
  return `Product photo of ${input.productName}. ${style}. Centered, neutral background, sharp focus, commercial quality.`;
}

/**
 * 상품 이미지 1장 생성 → (선택)배경 처리 → 최적화 저장.
 * 실 프로바이더 실패 시 예외를 던진다(호출부에서 재시도/폴백).
 */
export async function generateProductImage(
  input: GenerateProductImageInput,
): Promise<GeneratedProductImage> {
  const provider = imageProvider();
  let img = await provider.textToImage(buildPrompt(input), { size: input.size, seed: input.seed });

  if (input.background === "remove" && provider.removeBackground) {
    img = await provider.removeBackground(img.url);
  } else if (input.background === "replace" && provider.editImage && input.replacePrompt) {
    img = await provider.editImage(img.url, input.replacePrompt);
  }

  const supplierCode = input.supplierCode ?? "linkrcode";
  const externalId = input.externalId ?? `gen-${input.seed ?? Date.now()}`;
  const stored = await optimizeAndStore({
    catalogId: input.catalogId ?? null,
    supplierCode,
    externalId,
    sourceUrl: img.url,
    variants: input.variants ?? ["thumb", "card", "pdp"],
  });

  return { source: img, assets: stored, mock: Boolean(img.mock) };
}
