// filepath: src/lib/images/providers/fal.ts
import type { GeneratedImage, ImageProvider, ImageSize } from "../types";

/**
 * fal.ai 프로바이더 — 상용 안전 스택.
 *   textToImage    → FLUX.1-schnell (Apache-2.0)
 *   removeBackground → BiRefNet (MIT)
 *   editImage      → FLUX.1-Kontext (fal 엔드포인트, 출력 상업 사용 가능)
 *
 * env: FAL_KEY. 미설정 시 이 프로바이더는 선택되지 않고 mock으로 폴백된다.
 */

const FAL_SIZE: Record<ImageSize, string> = {
  square: "square_hd",
  portrait: "portrait_4_3",
  landscape: "landscape_4_3",
};

const MODEL_T2I = process.env.FAL_T2I_MODEL || "fal-ai/flux/schnell";
const MODEL_RMBG = process.env.FAL_RMBG_MODEL || "fal-ai/birefnet";
const MODEL_EDIT = process.env.FAL_EDIT_MODEL || "fal-ai/flux-pro/kontext";

export function falConfigured(): boolean {
  return Boolean(process.env.FAL_KEY?.trim());
}

async function falRun(model: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY!.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (json?.detail as string) || (json?.error as string) || `fal ${res.status}`;
    throw new Error(`fal ${model}: ${msg}`);
  }
  return json;
}

/** fal 응답에서 첫 이미지 URL 추출 (모델별로 images[] 또는 image 형태) */
function firstImageUrl(json: Record<string, unknown>): string | null {
  const images = json.images as Array<{ url?: string }> | undefined;
  if (images?.[0]?.url) return images[0].url;
  const image = json.image as { url?: string } | undefined;
  if (image?.url) return image.url;
  return null;
}

export const falImageProvider: ImageProvider = {
  code: "fal",

  async textToImage(prompt, opts): Promise<GeneratedImage> {
    const json = await falRun(MODEL_T2I, {
      prompt,
      image_size: FAL_SIZE[opts?.size ?? "square"],
      num_images: 1,
      ...(opts?.seed != null ? { seed: opts.seed } : {}),
    });
    const url = firstImageUrl(json);
    if (!url) throw new Error("fal textToImage: no image url");
    return { url, provider: "fal", model: MODEL_T2I };
  },

  async removeBackground(sourceUrl): Promise<GeneratedImage> {
    const json = await falRun(MODEL_RMBG, { image_url: sourceUrl });
    const url = firstImageUrl(json) ?? sourceUrl;
    return { url, provider: "fal", model: MODEL_RMBG };
  },

  async editImage(sourceUrl, instruction): Promise<GeneratedImage> {
    const json = await falRun(MODEL_EDIT, { image_url: sourceUrl, prompt: instruction });
    const url = firstImageUrl(json) ?? sourceUrl;
    return { url, provider: "fal", model: MODEL_EDIT };
  },
};
