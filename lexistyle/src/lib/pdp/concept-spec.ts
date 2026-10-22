/** ConceptSpec — linkrcode 3P 잠금 후 공장 입력 계약 */
import { PDP_RULESET_ID } from "./ruleset";
import {
  SAMPLE3_BLOCK_PLAN,
  SAMPLE3_STYLE_ID,
  SAMPLE3_TOKENS,
} from "@/lib/hq/seeds/sample3-style";

export const LAYOUT_IDS = ["editorial-fullbleed", "lookbook-split", "catalog-compact"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export type ConceptSpec = {
  layoutId: LayoutId;
  tokens?: Record<string, string>;
  blockPlan?: string[];
  voice?: string;
  copyRuleset?: string;
  imageRecipe?: {
    generate?: boolean;
    style?: string;
    backgroundPolicy?: "keep" | "remove" | "replace";
    replacePrompt?: string;
    plan?: { role: "hero" | "macro" | "trust"; prompt?: string; size?: string }[];
  };
  locale?: "ko" | "en";
  seedCatalogId?: number;
};

/** 기본 컨셉 = SAMPLE3 정본 (docs/lexi-sample3-pdp-style.md) — sample3ConceptSpec과 동일 문법, 순환 import 방지 */
export function defaultConceptSpec(seedCatalogId?: number, seedTitle?: string): ConceptSpec {
  const formHint = seedTitle?.trim() || "K-style curated product";
  return {
    layoutId: "editorial-fullbleed",
    tokens: {
      paper: SAMPLE3_TOKENS.paper,
      ink: SAMPLE3_TOKENS.ink,
      accent: SAMPLE3_TOKENS.accent,
      radius: SAMPLE3_TOKENS.radius,
      heroRatio: SAMPLE3_TOKENS.heroRatio,
      brand: SAMPLE3_TOKENS.brand,
      ruleset: SAMPLE3_STYLE_ID,
      style: SAMPLE3_STYLE_ID,
    },
    blockPlan: [...SAMPLE3_BLOCK_PLAN],
    voice: `${SAMPLE3_STYLE_ID} · 담백한 설렘 · brand-forward`,
    copyRuleset: PDP_RULESET_ID,
    imageRecipe: {
      generate: true,
      style: `SAMPLE3: ${formHint}, cream paper editorial, LEXI brand mood, no competitor logos, no on-image text`,
      backgroundPolicy: "replace",
      replacePrompt:
        "cafe window and soft plaza lifestyle for LEXI campaign, brand-forward editorial",
      plan: [
        {
          role: "hero",
          size: "portrait",
          prompt: `Hero fashion editorial for LEXI brand. ${formHint}. Soft morning window light, cream paper mood, K-fashion magazine, brand atmosphere LEXI, no text, no competitor logos, 3:4.`,
        },
        {
          role: "macro",
          size: "portrait",
          prompt: `Detail of the same garment: texture, stitch or signature motif, soft folds, lifestyle light for LEXI lookbook, no logos, no text, 3:4. Product: ${formHint}.`,
        },
        {
          role: "trust",
          size: "portrait",
          prompt: `Lifestyle wear of the same product, warm sunset or cafe plaza, easy daily romance, cream-ink palette, LEXI campaign confidence, no on-screen text, 3:4. Product: ${formHint}.`,
        },
      ],
    },
    locale: "ko",
    seedCatalogId,
  };
}

/** 자연어 한 줄 → ConceptSpec 부분 패치 (P1 채팅 루프) */
export function patchConceptFromChat(spec: ConceptSpec, chat: string): ConceptSpec {
  const t = chat.trim().toLowerCase();
  const next: ConceptSpec = { ...spec, tokens: { ...spec.tokens }, imageRecipe: { ...spec.imageRecipe } };

  if (/룩북|lookbook|split/i.test(chat)) next.layoutId = "lookbook-split";
  else if (/컴팩트|compact|catalog/i.test(chat)) next.layoutId = "catalog-compact";
  else if (/풀블리드|fullbleed|editorial/i.test(chat)) next.layoutId = "editorial-fullbleed";

  if (/미니멀|minimal|clean/i.test(chat)) next.voice = "클린 미니멀";
  else if (/룩북/i.test(chat)) next.voice = "룩북";
  else if (/에디토리얼|editorial|성수/i.test(chat)) next.voice = "성수 에디토리얼";

  if (/영문|english|en\b/i.test(chat)) next.locale = "en";
  if (/한글|korean|ko\b/i.test(chat)) next.locale = "ko";

  if (/히어로.*크|bigger hero|large hero/i.test(chat)) {
    next.tokens = { ...next.tokens, heroRatio: "3/4" };
  }
  if (/accent.*잉크|accent.*ink/i.test(chat)) {
    next.tokens = { ...next.tokens, accent: next.tokens?.ink ?? "#1a1a1a" };
  }
  if (/accent.*coral|accent.*코랄/i.test(chat)) {
    next.tokens = { ...next.tokens, accent: "#e85d4c" };
  }

  if (/이미지.*생성|ai image|generate image/i.test(chat)) {
    next.imageRecipe = { ...next.imageRecipe, generate: true };
  }
  if (/배경.*제거|remove bg|cutout/i.test(chat)) {
    next.imageRecipe = { ...next.imageRecipe, backgroundPolicy: "remove" };
  }

  if (t.includes("cta") && /장바구니|add to bag/i.test(chat)) {
    /* 카피 힌트 — 실제 CTA는 generatePdpText가 처리 */
  }

  if (/스타일[:：]\s*(.+)/i.test(chat)) {
    const m = chat.match(/스타일[:：]\s*(.+)/i);
    if (m?.[1]) next.imageRecipe = { ...next.imageRecipe, style: m[1].trim() };
  }

  return next;
}

export function conceptToGoldenFields(spec: ConceptSpec) {
  return {
    tokens: spec.tokens,
    blockPlan: spec.blockPlan,
    copyRuleset: spec.copyRuleset,
    imageRecipe: spec.imageRecipe,
    createdFromPrompt: spec.voice,
    conceptSpec: spec,
  };
}
