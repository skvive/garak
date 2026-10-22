import type { GeneratedImage, ImageProvider, ImageSize } from "@/lib/images/types";
import { wanConfigured, wanImageModel } from "./config";
import { wanPostJson } from "./client";

/**
 * Wan 2.7 이미지 — sync multimodal-generation.
 * POST /api/v1/services/aigc/multimodal-generation/generation
 */

const SIZE_TOKEN: Record<ImageSize, string> = {
  square: "1024*1024",
  portrait: "768*1344",
  landscape: "1344*768",
};

export { wanConfigured };

export const wanImageProvider: ImageProvider = {
  code: "wan",

  async textToImage(prompt, opts): Promise<GeneratedImage> {
    const model = wanImageModel();
    const size = SIZE_TOKEN[opts?.size ?? "square"];
    const body: Record<string, unknown> = {
      model,
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
      },
      parameters: {
        size,
        n: 1,
        watermark: false,
        thinking_mode: false,
      },
    };
    if (opts?.seed != null) {
      (body.parameters as Record<string, unknown>).seed = opts.seed;
    }

    const resp = await wanPostJson("/services/aigc/multimodal-generation/generation", body, {
      async: false,
      timeoutMs: 300_000,
    });

    const url = extractImageUrl(resp);
    if (!url) throw new Error("wan textToImage: no image url in response");
    return { url, provider: "wan", model };
  },

  async editImage(sourceUrl, instruction, opts?: { timeoutMs?: number }): Promise<GeneratedImage> {
    const model = wanImageModel();
    const body = {
      model,
      input: {
        messages: [
          {
            role: "user",
            content: [{ image: sourceUrl }, { text: instruction }],
          },
        ],
      },
      parameters: {
        size: "1024*1024",
        n: 1,
        watermark: false,
        thinking_mode: false,
      },
    };
    const resp = await wanPostJson("/services/aigc/multimodal-generation/generation", body, {
      async: false,
      timeoutMs: opts?.timeoutMs,
    });
    const url = extractImageUrl(resp);
    if (!url) throw new Error("wan editImage: no image url in response");
    return { url, provider: "wan", model };
  },
};

function extractImageUrl(resp: Record<string, unknown>): string | null {
  const output = resp.output as Record<string, unknown> | undefined;
  const choices = (output?.choices as Array<Record<string, unknown>>) ?? [];
  for (const choice of choices) {
    const message = choice.message as Record<string, unknown> | undefined;
    const content = (message?.content as Array<Record<string, unknown>>) ?? [];
    for (const c of content) {
      if (c.type === "image" && typeof c.image === "string" && c.image) return c.image;
      if (typeof c.image === "string" && c.image) return c.image;
    }
  }
  // some responses use results[].url
  const results = (output?.results as Array<Record<string, unknown>>) ?? [];
  for (const r of results) {
    if (typeof r.url === "string" && r.url) return r.url;
  }
  return null;
}
