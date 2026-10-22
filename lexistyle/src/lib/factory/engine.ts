// filepath: src/lib/factory/engine.ts
import { getCatalogById } from "@/lib/catalog/index-store";
import { generatePdpForCatalog } from "@/lib/pdp/generate";
import { generateMarketingAssets } from "@/lib/pdp/marketing-images";
import { createBatch, getTemplate } from "./store";
import type { FactoryBatch, FactoryItem, GoldenTemplate } from "./types";

/**
 * 병렬 워커 풀 — 동시성 캡 N을 넘지 않게 items를 처리한다("천재병렬" 코어).
 * 각 item은 독립 체인이라 단계 배리어가 없다(가장 느린 단일 체인 = 벽시계).
 */
async function pool<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: size }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

/** 지수 백오프 재시도 (외부 API 레이트리밋 대비) */
async function withRetry<R>(fn: () => Promise<R>, maxAttempts: number): Promise<{ value?: R; attempts: number; error?: string }> {
  let attempts = 0;
  let lastErr: unknown;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      return { value: await fn(), attempts };
    } catch (e) {
      lastErr = e;
      if (attempts < maxAttempts) {
        const wait = Math.min(8000, 500 * 2 ** (attempts - 1));
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  return { attempts, error: lastErr instanceof Error ? lastErr.message : String(lastErr) };
}

export type FactoryRunInput = {
  templateId?: number | null;
  catalogIds: number[];
  concurrency?: number;
  maxAttempts?: number;
  locale?: string;
  /** 이미 PDP 문서가 있는 상품은 스킵(멱등) */
  skipExisting?: boolean;
};

/**
 * 단일 상품 처리 체인: (선택)AI 이미지 생성 → PDP 생성(카피+렌더+저장).
 * 골든 템플릿의 imageRecipe/copyRuleset을 적용한다.
 */
async function processOne(catalogId: number, template: GoldenTemplate | null, opts: FactoryRunInput): Promise<FactoryItem> {
  const row = await getCatalogById(catalogId);
  if (!row) return { catalogId, status: "failed", attempts: 0, error: "catalog item not found" };

  // 멱등: 이미 문서가 있으면 스킵
  if (opts.skipExisting && row.documentId) {
    return { catalogId, status: "skipped", productId: row.productId, documentId: row.documentId, attempts: 0 };
  }

  let imageUrl: string | undefined;
  let imageUrls: string[] | undefined;

  const run = await withRetry(async () => {
    // 1) (선택) 골든 템플릿 레시피대로 마케팅 3-shot 이미지 생성
    if (template?.imageRecipe?.generate) {
      const category = row.categoryPath?.slice(-1)?.[0];
      const marketing = await generateMarketingAssets({
        productName: row.title,
        category,
        styleOverride: template.imageRecipe.style,
        backgroundPolicy: template.imageRecipe.backgroundPolicy ?? "keep",
        replacePrompt: template.imageRecipe.replacePrompt,
        supplierCode: row.supplierCode,
        catalogId: row.id,
        existingUrls: row.primaryThumbUrl ? [row.primaryThumbUrl] : undefined,
      });
      imageUrls = marketing.urls.length ? marketing.urls : undefined;
      imageUrl = imageUrls?.[0];
    }
    // 2) PDP 생성 (기존 파이프라인 재사용: 카피 LLM → designDoc → HTML → 저장)
    const res = await generatePdpForCatalog(catalogId, {
      locale: opts.locale ?? template?.conceptSpec?.locale,
      conceptSpec: template?.conceptSpec,
      templateId: opts.templateId ?? template?.id,
      extraAssetUrls: imageUrls,
    });
    return res;
  }, opts.maxAttempts ?? 2);

  if (run.error) {
    return { catalogId, status: "failed", attempts: run.attempts, error: run.error, imageUrl };
  }
  const res = run.value as { documentId?: number; productId?: number | null };
  return {
    catalogId,
    status: "ok",
    productId: res?.productId ?? row.productId,
    documentId: res?.documentId,
    imageUrl,
    attempts: run.attempts,
  };
}

/**
 * 배치 실행 — 골든 템플릿 × 상품 목록을 병렬 팬아웃 생성.
 * 완료된 FactoryBatch(진행/성공/실패 집계)를 반환한다.
 */
export async function runFactoryBatch(input: FactoryRunInput): Promise<FactoryBatch> {
  const template = input.templateId != null ? getTemplate(input.templateId) : null;
  if (input.templateId != null && !template) {
    throw new Error("template not found");
  }
  if (input.templateId != null && !template?.locked) {
    throw new Error("template must be locked before factory run — use 컨셉 확정 first");
  }
  const concurrency = Math.max(1, Math.min(8, input.concurrency ?? 5));
  const batch = createBatch({
    templateId: input.templateId ?? null,
    total: input.catalogIds.length,
    status: "running",
    ok: 0,
    failed: 0,
    skipped: 0,
    concurrency,
    items: [],
    startedAt: new Date().toISOString(),
  });

  await pool(input.catalogIds, concurrency, async (catalogId) => {
    const item = await processOne(catalogId, template, input);
    batch.items.push(item);
    if (item.status === "ok") batch.ok++;
    else if (item.status === "skipped") batch.skipped++;
    else batch.failed++;
  });

  batch.status = batch.failed > 0 && batch.ok === 0 ? "failed" : "done";
  batch.finishedAt = new Date().toISOString();
  return batch;
}
