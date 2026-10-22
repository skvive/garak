// filepath: src/lib/images/types.ts
/**
 * AI 이미지 생성 프로바이더 인터페이스 — linkrcode Phase 1.
 * 각 메서드는 생성/편집된 이미지의 **URL**을 반환한다. 이후 optimizeAndStore가
 * 그 URL을 다운로드 → WebP 최적화 → Blob/로컬 저장하므로 파이프라인이 자연 연결된다.
 */

export type ImageSize =
  | "square" // 1:1 (상품 히어로 기본)
  | "portrait" // 3:4 (모바일 PDP)
  | "landscape"; // 4:3 (배너)

export type GeneratedImage = {
  url: string;
  provider: string;
  model: string;
  /** 목업(키 미설정) 여부 — 호출부에서 데모 표기 */
  mock?: boolean;
};

export interface ImageProvider {
  code: string;
  /** 텍스트 → 이미지 (상품 히어로/라이프스타일) */
  textToImage(prompt: string, opts?: { size?: ImageSize; seed?: number }): Promise<GeneratedImage>;
  /** 이미지 배경 제거 (컷아웃) — 미지원 시 원본 URL 그대로 반환 */
  removeBackground?(url: string): Promise<GeneratedImage>;
  /** 이미지 편집(배경 교체·리라이팅) — 지시 프롬프트 기반. 미지원 시 원본 반환 */
  editImage?(url: string, instruction: string): Promise<GeneratedImage>;
}
