// filepath: src/lib/images/providers/openrouter-image.ts
/**
 * OpenRouter GPT image provider ? uses POST /api/v1/images/generations.
 * gpt-image-1 is NOT usable via chat/completions (OpenRouter requirement).
 * Favors gpt-image-1 (cheap) with quality medium. Env: OPENROUTER_API_KEY required.
 * editImage falls back to textToImage with a stable seed for face approximation.
 */
import type { GeneratedImage, ImageProvider, ImageSize } from "../types";

const KEY = process.env.OPENROUTER_API_KEY?.trim() || "";
const MODEL = process.env.OPENROUTER_IMAGE_MODEL?.trim() || "openai/gpt-image-1";
const QUALITY = process.env.OPENROUTER_IMAGE_QUALITY?.trim() || "medium";
const BASE = process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";

const SIZE_MAP: Record<ImageSize, string> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
};

function extractImageUrl(data: any): string | null {
  try {
    const d = data?.data?.[0];
    if (d?.b64_json) return `data:image/png;base64,${d.b64_json}`;
    if (d?.url) return d.url;
    const plural = data?.data;
    if (Array.isArray(plural) && plural.length && typeof plural[0] === "string") return plural[0];
  } catch {}
  return null;
}

async function generate(prompt: string, opts?: { size?: ImageSize; seed?: number }): Promise<GeneratedImage> {
  if (!KEY) throw new Error("OPENROUTER_API_KEY required for image generation");
  const body: Record<string, unknown> = {
    model: MODEL,
    prompt,
    n: 1,
    size: SIZE_MAP[opts?.size ?? "square"],
    quality: QUALITY,
  };
  if (opts?.seed != null) body.seed = opts.seed;
  const res = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lexistyle.vercel.app",
      "X-Title": "LEXI PDP Factory",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`openrouter image: ${json?.error?.message ?? res.status}`);
  }
  const url = extractImageUrl(json);
  if (!url) throw new Error("openrouter image: no image in response");
  return { url, provider: "openrouter", model: MODEL };
}

export const openrouterImageProvider: ImageProvider = {
  code: "openrouter",
  async textToImage(prompt, opts) {
    return generate(prompt, opts);
  },
  async editImage(sourceUrl, instruction) {
    // gpt-image-1 via OpenRouter images API: prompt + seed only (no reference upload).
    return generate(instruction, { size: "portrait", seed: 42 });
  },
};
