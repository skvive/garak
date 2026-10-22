// filepath: src/lib/factory/store.ts
import type { FactoryBatch, GoldenTemplate } from "./types";

/**
 * 공장 상태 저장 — 골든 템플릿 + 배치 잡. 런타임 globalThis 저장(무DB).
 * v1은 프로세스 메모리로 충분하며, 영속화는 hq_state/테이블 이관 시 확장.
 */
const g = globalThis as unknown as {
  __lexiGolden?: GoldenTemplate[];
  __lexiGoldenSeq?: number;
  __lexiBatches?: FactoryBatch[];
  __lexiBatchSeq?: number;
};

function init() {
  if (!g.__lexiGolden) g.__lexiGolden = [];
  if (!g.__lexiGoldenSeq) g.__lexiGoldenSeq = 1;
  if (!g.__lexiBatches) g.__lexiBatches = [];
  if (!g.__lexiBatchSeq) g.__lexiBatchSeq = 1;
}

// ---- 골든 템플릿 ----
export function listTemplates(): GoldenTemplate[] {
  init();
  return g.__lexiGolden!;
}
export function getTemplate(id: number): GoldenTemplate | null {
  init();
  return g.__lexiGolden!.find((t) => t.id === id) ?? null;
}
export function createTemplate(input: Omit<GoldenTemplate, "id" | "createdAt">): GoldenTemplate {
  init();
  const t: GoldenTemplate = { ...input, locked: false, id: g.__lexiGoldenSeq!++, createdAt: new Date().toISOString() };
  g.__lexiGolden!.unshift(t);
  return t;
}

export function updateTemplate(id: number, patch: Partial<GoldenTemplate>): GoldenTemplate | null {
  init();
  const idx = g.__lexiGolden!.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const cur = g.__lexiGolden![idx];
  const next = { ...cur, ...patch, id: cur.id, createdAt: cur.createdAt };
  g.__lexiGolden![idx] = next;
  return next;
}

// ---- 배치 잡 ----
export function createBatch(input: Omit<FactoryBatch, "id">): FactoryBatch {
  init();
  const b: FactoryBatch = { ...input, id: g.__lexiBatchSeq!++ };
  g.__lexiBatches!.unshift(b);
  return b;
}
export function getBatch(id: number): FactoryBatch | null {
  init();
  return g.__lexiBatches!.find((b) => b.id === id) ?? null;
}
export function listBatches(limit = 50): FactoryBatch[] {
  init();
  return g.__lexiBatches!.slice(0, limit);
}
