/**
 * ICE 스코어링 + 근거 레벨 태그 (M9) — ah-my-marketing 이식.
 * ICE = (Impact + Confidence + Ease) / 3, 각 1~10.
 * 근거 레벨은 Confidence를 검증 강도로 등급화 → 낮으면 승인 게이트에서 사람 검수 강제.
 */
import type { EvidenceLevel, IceScore } from "./types";

const ORDER: EvidenceLevel[] = ["Contested", "Expert", "Emerging", "Moderate", "Strong"];

export function evidenceFromConfidence(confidence: number): EvidenceLevel {
  if (confidence >= 9) return "Strong";
  if (confidence >= 7) return "Moderate";
  if (confidence >= 5) return "Emerging";
  if (confidence >= 3) return "Expert";
  return "Contested";
}

export function makeIce(impact: number, confidence: number, ease: number): IceScore {
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  const i = clamp(impact), c = clamp(confidence), e = clamp(ease);
  return {
    impact: i,
    confidence: c,
    ease: e,
    evidence: evidenceFromConfidence(c),
    score: +((i + c + e) / 3).toFixed(2),
  };
}

/** 근거 레벨 낮으면(Expert/Contested) ICE 높아도 우선순위 강등 — 사람 검수 필요 */
export function needsHumanReview(ice: IceScore): boolean {
  return ORDER.indexOf(ice.evidence) <= ORDER.indexOf("Expert");
}

export function evidenceRank(e: EvidenceLevel): number {
  return ORDER.indexOf(e);
}

/** 여러 카피/훅 정렬: 근거 레벨 우선, 그다음 ICE 점수 */
export function rankByEvidenceThenIce<T extends { ice: IceScore }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      evidenceRank(b.ice.evidence) - evidenceRank(a.ice.evidence) ||
      b.ice.score - a.ice.score,
  );
}
