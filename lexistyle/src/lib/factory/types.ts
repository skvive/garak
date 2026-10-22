// filepath: src/lib/factory/types.ts
/**
 * 페이지 공장(Page Factory) — linkrcode Phase 4.
 * 스튜디오에서 확정한 "골든 템플릿"을 소싱 상품 목록에 병렬 팬아웃해 대량 생성한다.
 */

import type { ConceptSpec } from "@/lib/pdp/concept-spec";

/** 스튜디오 산출물 = 공장 입력. 설계 보고서 §4.2 */
export type GoldenTemplate = {
  id: number;
  name: string;
  createdFromPrompt?: string;
  /** tokens.css 값 (테마) */
  tokens?: Record<string, string>;
  /** 블록 순서/구성 */
  blockPlan?: string[];
  /** 이미지 생성 레시피 */
  imageRecipe?: {
    /** 활성화 시 상품마다 AI 히어로 이미지 신규 생성 */
    generate?: boolean;
    style?: string;
    backgroundPolicy?: "keep" | "remove" | "replace";
    replacePrompt?: string;
  };
  /** 카피 규칙(anti-slop 등) */
  copyRuleset?: string;
  /** export 대상 채널 */
  channelTargets?: string[];
  /** linkrcode ConceptSpec — 잠금 후 공장만 사용 */
  conceptSpec?: ConceptSpec;
  /** true일 때만 factory/run 허용 */
  locked?: boolean;
  lockedAt?: string;
  createdAt: string;
};

export type FactoryItemStatus = "ok" | "failed" | "skipped";

export type FactoryItem = {
  catalogId: number;
  status: FactoryItemStatus;
  productId?: number | null;
  documentId?: number | null;
  imageUrl?: string;
  attempts: number;
  error?: string;
};

export type FactoryBatch = {
  id: number;
  templateId: number | null;
  total: number;
  status: "running" | "done" | "failed";
  ok: number;
  failed: number;
  skipped: number;
  concurrency: number;
  items: FactoryItem[];
  startedAt: string;
  finishedAt?: string;
};
