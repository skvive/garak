/**
 * Hook Lab (M9) — ah-my-marketing amm-hook-lab.md 이식.
 * 6유형(PAIN/QUES/STAT/SOC/EMO/BENE) 균등 발산 → ICE-lite(Impact+Ease) → Top-K 채널 매핑.
 * 결정적 템플릿 기반. LLM 스왑인 시 발산 단계만 교체.
 */
import type { Hook, HookType } from "./types";
import { makeIce, rankByEvidenceThenIce } from "./ice";
import { antiSlop } from "./antislop";

export type HookSeed = {
  title: string;
  category: string;
  benefit: string; // 핵심 혜택
  painPoint: string; // 해결하는 불편
  audience: string; // 타깃 (예: "해외직구족")
};

const CHANNEL_BY_TYPE: Record<HookType, string> = {
  PAIN: "메타 피드/IMG1x1",
  QUES: "인스타 스토리/VID9x16",
  STAT: "메타 피드/IMG1x1",
  SOC: "틱톡/VID9x16",
  EMO: "릴스/VID9x16",
  BENE: "쿠팡 상품명/텍스트",
};

const TEMPLATES: Record<HookType, (s: HookSeed) => string[]> = {
  PAIN: (s) => [
    `아직도 ${s.painPoint}?`,
    `${s.painPoint} 이제 그만.`,
    `${s.audience}이 매번 겪는 ${s.painPoint}`,
  ],
  QUES: (s) => [
    `${s.benefit} 해본 적 있나요?`,
    `${s.category}, 제대로 골라본 적 있어요?`,
    `${s.painPoint} 없이 살 수 있다면?`,
  ],
  STAT: (s) => [
    `${s.audience} 10명 중 8명이 다시 찾는 ${s.category}`,
    `재구매율 뒤에 숨은 ${s.benefit}의 이유`,
    `${s.category} 리뷰 90%가 말하는 한 가지`,
  ],
  SOC: (s) => [
    `${s.audience}이 조용히 재구매하는 ${s.category}`,
    `아는 사람만 담아두는 ${s.benefit}`,
    `후기에서 계속 언급되는 그 ${s.category}`,
  ],
  EMO: (s) => [
    `${s.benefit}, 그 첫 느낌 기억하세요?`,
    `${s.painPoint}에 지친 당신에게`,
    `사소하지만 매일 달라지는 ${s.benefit}`,
  ],
  BENE: (s) => [
    `${s.benefit} — 오늘부터 달라집니다`,
    `${s.category} 하나로 ${s.benefit}`,
    `${s.painPoint} 없이 ${s.benefit}까지`,
  ],
};

// 유형별 기본 Impact/Ease 프로파일(스킬의 채널 적합도 반영)
const PROFILE: Record<HookType, { impact: number; ease: number }> = {
  PAIN: { impact: 9, ease: 8 },
  QUES: { impact: 7, ease: 9 },
  STAT: { impact: 8, ease: 6 },
  SOC: { impact: 8, ease: 7 },
  EMO: { impact: 7, ease: 7 },
  BENE: { impact: 9, ease: 9 },
};

export function generateHooks(seed: HookSeed, topK = 10): Hook[] {
  const all: Hook[] = [];
  (Object.keys(TEMPLATES) as HookType[]).forEach((type) => {
    const prof = PROFILE[type];
    TEMPLATES[type](seed).forEach((raw, i) => {
      const text = antiSlop(raw).text;
      // 근거: 유형 자체는 검증 전 가설(STAT은 수치 근거 없으면 Expert), 대표값으로 confidence 부여
      const confidence = type === "STAT" ? 4 : type === "SOC" ? 6 : 5;
      const ice = makeIce(prof.impact - i * 0.5, confidence, prof.ease - i * 0.3);
      all.push({ type, text, ice, channel: CHANNEL_BY_TYPE[type] });
    });
  });
  return rankByEvidenceThenIce(all).slice(0, topK);
}
