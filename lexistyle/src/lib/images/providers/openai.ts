// filepath: src/lib/images/providers/openai.ts
import type { GeneratedImage, ImageProvider, ImageSize } from "../types";

/**
 * OpenAI Images 프로바이더 (gpt-image-1).
 *   textToImage → POST /v1/images/generations
 *   editImage   → POST /v1/images/edits (multipart)
 * gpt-image-1은 response_format 파라미터를 지원하지 않고 항상 b64_json만 반환하므로
 * (fal처럼 호스팅 URL이 없음) base64를 data: URL로 변환해 반환한다 —
 * optimizeAndStore가 fetch(sourceUrl)로 그대로 받아 처리 가능(Node fetch가 data: URL 지원).
 * removeBackground는 OpenAI에 대응 엔드포인트가 없어 미구현(옵셔널 — 호출부가 자동 스킵).
 *
 * env: OPENAI_API_KEY. 미설정 시 이 프로바이더는 선택되지 않고 mock으로 폴백된다.
 */

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

const OPENAI_SIZE: Record<ImageSize, string> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
};

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function toDataUrl(b64: string, mime = "image/png") {
  return `data:${mime};base64,${b64}`;
}

function apiKeyHeader(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}` };
}

export const openaiImageProvider: ImageProvider = {
  code: "openai",

  async textToImage(prompt, opts): Promise<GeneratedImage> {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { ...apiKeyHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: OPENAI_SIZE[opts?.size ?? "square"],
        n: 1,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`openai images/generations: ${json?.error?.message ?? res.status}`);
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai textToImage: no image data");
    return { url: toDataUrl(b64), provider: "openai", model: MODEL };
  },

  async editImage(sourceUrl, instruction): Promise<GeneratedImage> {
    const srcRes = await fetch(sourceUrl);
    if (!srcRes.ok) throw new Error(`openai editImage: source fetch failed ${srcRes.status}`);
    const buf = await srcRes.arrayBuffer();
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", instruction);
    form.append("image", new Blob([buf], { type: srcRes.headers.get("content-type") || "image/png" }), "source.png");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: apiKeyHeader(),
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`openai images/edits: ${json?.error?.message ?? res.status}`);
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai editImage: no image data");
    return { url: toDataUrl(b64), provider: "openai", model: MODEL };
  },
};
