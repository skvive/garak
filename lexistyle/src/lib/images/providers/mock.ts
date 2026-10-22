// filepath: src/lib/images/providers/mock.ts
import { createHash } from "crypto";
import type { GeneratedImage, ImageProvider, ImageSize } from "../types";

/**
 * 목업 프로바이더 — FAL_KEY 등 미설정 시 폴백.
 * 프롬프트 해시로 결정적 placeholder(picsum) URL을 만들어 파이프라인이 키 없이도 동작한다.
 */
const DIM: Record<ImageSize, [number, number]> = {
  square: [1024, 1024],
  portrait: [960, 1280],
  landscape: [1280, 960],
};

function seedUrl(text: string, size: ImageSize): string {
  const seed = createHash("sha256").update(text).digest("hex").slice(0, 16);
  const [w, h] = DIM[size];
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

export const mockImageProvider: ImageProvider = {
  code: "mock",
  async textToImage(prompt, opts) {
    return { url: seedUrl(prompt, opts?.size ?? "square"), provider: "mock", model: "placeholder", mock: true };
  },
  async removeBackground(url) {
    return { url, provider: "mock", model: "placeholder", mock: true };
  },
  async editImage(url, instruction) {
    // 목업은 편집을 흉내내지 못하므로 프롬프트를 반영한 새 placeholder 반환
    return { url: seedUrl(url + instruction, "square"), provider: "mock", model: "placeholder", mock: true };
  },
};
