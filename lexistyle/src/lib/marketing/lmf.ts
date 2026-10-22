/**
 * LMF 카피 엔진 (M9) — ah-my-marketing amm-copy-lmf.md 이식.
 * Prepare(페르소나·VP) → Diverge(카피 발산, Generator) → Converge(ICE 채점, Evaluator).
 * 결정적 구현. LLM 스왑인 시 deriveVP·divergeCopy를 프롬프트로 교체(스키마 동일).
 */
import type { CopyVariant, Persona, ValuePromise } from "./types";
import { makeIce, rankByEvidenceThenIce } from "./ice";
import { antiSlop } from "./antislop";

export type LmfSeed = {
  title: string;
  category: string;
  benefit: string;
  painPoint: string;
  audience: string;
  priceUsd?: number;
};

/* ---------- Prepare: 페르소나 + VP ---------- */
export function derivePersona(seed: LmfSeed): Persona {
  return {
    target: seed.audience,
    painPoint: seed.painPoint,
    currentAlternative: `일반 ${seed.category}`,
    why: `${seed.painPoint}를 겪지만 마땅한 대안을 못 찾음`,
  };
}

export function deriveValuePromises(seed: LmfSeed): ValuePromise[] {
  return [
    {
      code: "VP1",
      axis: "문제해결",
      promise: `${seed.painPoint} 해결`,
      customerLanguage: `${seed.painPoint}, 이걸로 끝냈어요`,
    },
    {
      code: "VP2",
      axis: "차별화",
      promise: `정품 직소싱 ${seed.category}`,
      customerLanguage: `해외 정품을 관세까지 계산해서 받았어요`,
    },
    {
      code: "VP3",
      axis: "니즈만족",
      promise: seed.benefit,
      customerLanguage: `${seed.benefit}, 매일 쓰게 되네요`,
    },
  ];
}

/* ---------- Diverge → Converge: VP별 카피 변형 ---------- */
export function generateCopy(seed: LmfSeed, startId: number): CopyVariant[] {
  const vps = deriveValuePromises(seed);
  const variants: CopyVariant[] = [];
  let id = startId;

  for (const vp of vps) {
    const drafts: { headline: string; body: string; cta: string; impact: number; conf: number; ease: number }[] = [
      {
        headline: vp.customerLanguage,
        body: `${seed.audience}을 위한 ${seed.category}. ${vp.promise}까지 한 번에.`,
        cta: "지금 담아두기",
        impact: 9, conf: vp.axis === "문제해결" ? 8 : 6, ease: 9,
      },
      {
        headline: `${vp.promise}, 오늘부터`,
        body: `${seed.painPoint} 없이 ${seed.benefit}. LEXI가 정품으로 골랐습니다.`,
        cta: "관세 포함가 확인",
        impact: 8, conf: vp.axis === "차별화" ? 7 : 5, ease: 8,
      },
    ];

    for (const d of drafts) {
      const headline = antiSlop(d.headline);
      const body = antiSlop(d.body);
      const cta = antiSlop(d.cta);
      variants.push({
        id: id++,
        vpCode: vp.code,
        headline: headline.text,
        body: body.text,
        cta: cta.text,
        ice: makeIce(d.impact, d.conf, d.ease),
        antiSlopPasses: Math.max(headline.passes, body.passes, cta.passes),
      });
    }
  }
  return rankByEvidenceThenIce(variants);
}
