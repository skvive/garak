/**
 * 숏폼 스토리보드 파이프라인 (M10) — Amore_project llm_agent.py 이식.
 * 핵심: 제약 JSON 스키마 + 검증기 + 정규화/폴백 → 렌더러는 항상 유효한 보드를 받는다.
 * 순수 로직(TS 재구현). LLM 스왑인 시 generate 단계만 교체하고 verify/normalize는 유지.
 *
 * 규칙: 씬수 = 이미지수, Σduration = TOTAL_SECONDS, imageIndex 0..n-1 순열,
 *       overlayText 한글 포함 & ≤ MAX_OVERLAY자.
 */
import type { Scene, Storyboard } from "./types";

export const TOTAL_SECONDS = 15;
export const MAX_OVERLAY = 15;
const HANGUL = /[가-힣]/;

/** 15초를 n씬에 균등 분배 (Amore distribute_15s) */
export function distributeSeconds(n: number, total = TOTAL_SECONDS): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

function clampOverlay(text: string, fallback: string): string {
  let t = (text ?? "").trim();
  if (!HANGUL.test(t)) t = fallback; // 한글 없으면 대체
  if (t.length > MAX_OVERLAY) t = t.slice(0, MAX_OVERLAY);
  return t || fallback;
}

/** 검증: 위반 0이면 true */
export function verifyStoryboard(sb: Partial<Storyboard>, imgCount: number): boolean {
  const scenes = sb.scenes ?? [];
  if (scenes.length !== imgCount) return false;
  if (scenes.reduce((a, s) => a + (s.duration | 0), 0) !== TOTAL_SECONDS) return false;
  const idx = new Set(scenes.map((s) => s.imageIndex));
  if (idx.size !== imgCount) return false;
  for (let i = 0; i < imgCount; i++) if (!idx.has(i)) return false;
  for (const s of scenes) {
    if (!HANGUL.test(s.overlayText ?? "")) return false;
    if ((s.overlayText ?? "").length > MAX_OVERLAY) return false;
  }
  return !!sb.bgmMood;
}

/** 어떤 근사 보드든 유효 보드로 복구 (Amore _normalize_storyboard) */
export function normalizeStoryboard(
  sb: Partial<Storyboard>,
  imgCount: number,
  overlayFallbacks: string[],
): Storyboard {
  const durs = distributeSeconds(imgCount);
  const raw = sb.scenes ?? [];
  const scenes: Scene[] = [];
  const usedIdx = new Set<number>();

  for (let i = 0; i < imgCount; i++) {
    const src = raw[i] ?? {};
    // imageIndex: 중복/범위이탈이면 i로 재배정
    let imageIndex = typeof src.imageIndex === "number" ? src.imageIndex : i;
    if (imageIndex < 0 || imageIndex >= imgCount || usedIdx.has(imageIndex)) imageIndex = i;
    usedIdx.add(imageIndex);
    scenes.push({
      duration: durs[i],
      imageIndex,
      overlayText: clampOverlay(src.overlayText ?? "", overlayFallbacks[i] ?? overlayFallbacks[0] ?? "지금 만나보세요"),
    });
  }
  return {
    brand: sb.brand,
    bgmMood: sb.bgmMood || "clean",
    scenes,
    totalSeconds: TOTAL_SECONDS,
    valid: true,
    source: verifyStoryboard(sb, imgCount) ? "ai" : "normalized",
  };
}

/** 결정적 폴백 보드 (Amore _fallback_storyboard) */
export function fallbackStoryboard(imgCount: number, overlays: string[], brand?: string): Storyboard {
  const durs = distributeSeconds(imgCount);
  return {
    brand,
    bgmMood: "clean",
    scenes: durs.map((d, i) => ({
      duration: d,
      imageIndex: i,
      overlayText: clampOverlay(overlays[i] ?? "", overlays[0] ?? "LEXI 큐레이션"),
    })),
    totalSeconds: TOTAL_SECONDS,
    valid: true,
    source: "fallback",
  };
}

/**
 * 스토리보드 생성 진입점 — 결정적 계획 + 검증/정규화.
 * overlays는 훅/카피에서 뽑은 오버레이 후보(한글, 짧게). imageCount는 리스팅 자산 수(2~6 권장).
 */
export function buildStoryboard(opts: {
  imageCount: number;
  overlays: string[];
  bgmMood?: string;
  brand?: string;
}): Storyboard {
  const n = Math.max(2, Math.min(opts.imageCount, 6));
  const durs = distributeSeconds(n);
  const scenes: Scene[] = durs.map((d, i) => ({
    duration: d,
    imageIndex: i,
    overlayText: clampOverlay(opts.overlays[i] ?? "", opts.overlays[0] ?? "지금 만나보세요"),
  }));
  const candidate: Partial<Storyboard> = { brand: opts.brand, bgmMood: opts.bgmMood ?? "clean", scenes };
  if (verifyStoryboard(candidate, n)) {
    return { ...(candidate as Storyboard), totalSeconds: TOTAL_SECONDS, valid: true, source: "ai" };
  }
  return normalizeStoryboard(candidate, n, opts.overlays.length ? opts.overlays : ["지금 만나보세요"]);
}
