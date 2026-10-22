/** Durable export jobs — LEXI / Coupang / Cafe24 / Alibaba package */
import { and, eq, lte, or, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { catalogIndex, exportJobs, productImages, products } from "@/db/schema";
import { getChannelAdapter } from "@/lib/channels/registry";
import type { PublishInput } from "@/lib/channels/types";
import type { Channel, Listing, ListingDraft } from "@/lib/hq/types";
import { computeSellPrice, computeRetailPrice } from "@/lib/hq/types";
import { computeGlobalPrice, guessHsCategory, jurisdictionForChannel } from "@/lib/pricing/global-calculator";
import { getState as getHqState } from "@/lib/hq/store";
import { getCatalogById } from "@/lib/catalog/index-store";
import { getPdpDocument } from "@/lib/pdp/generate";
import type { PdpStructured } from "@/lib/pdp/ruleset";
import { validatePdp, validatePdpForChannel } from "@/lib/pdp/ruleset";
import { validateChannelExport } from "@/lib/export/channel-projection";
import { localStore, scheduleLocalPersist, reviveDates } from "@/lib/local-store";
import { absoluteUrl } from "@/lib/site-url";
import type { ShelfOption } from "@/lib/export/shelf";
import { cjOptionsToListingOptions, resolveCjExportOptions } from "@/lib/catalog/cj-options";
import type { ListingOption } from "@/lib/hq/types";

type MemExport = {
  id: number;
  documentId: number;
  documentVersion: number;
  channelCode: string;
  operation: string;
  status: string;
  idempotencyKey: string;
  attemptCount: number;
  maxAttempts: number;
  requestPayload: unknown;
  responsePayload: unknown;
  artifactUrl: string | null;
  externalRef: string | null;
  lastError: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

const g = globalThis as unknown as {
  __lexiExports?: MemExport[];
  __lexiExportSeq?: number;
  __lexiExportHydrated?: boolean;
};
function mem() {
  if (!g.__lexiExportHydrated) {
    const s = localStore();
    g.__lexiExports = ((s.exports ?? []) as MemExport[]).map((j) =>
      reviveDates(j as unknown as Record<string, unknown>, ["createdAt", "completedAt"]) as unknown as MemExport,
    );
    g.__lexiExportSeq = s.exportSeq ?? 1;
    g.__lexiExportHydrated = true;
  }
  if (!g.__lexiExports) g.__lexiExports = [];
  if (!g.__lexiExportSeq) g.__lexiExportSeq = 1;
  return g;
}
function persistExports() {
  const s = localStore();
  s.exports = mem().__lexiExports;
  s.exportSeq = mem().__lexiExportSeq;
  scheduleLocalPersist();
}

function safeImages(urls: string[]) {
  return urls.filter((u) => u && !/cjdropshipping\.com/i.test(u));
}

/** 채널별 marginPolicy 미설정 시 기본값 — reviewDraft(hq/services.ts)와 동일 기준 */

function toPublishInput(
  doc: { id?: number; title: string; renderedHtml?: string | null; body?: unknown },
  channelCode: string,
  price?: { factoryUsd?: number; sellUsd?: number },
): PublishInput {
  const body = (doc.body ?? {}) as {
    structured?: PdpStructured;
    assetUrls?: string[];
    productId?: number | null;
    catalogId?: number;
  };
  const structured = body.structured;
  const images = safeImages(body.assetUrls ?? []).map((url, i) => ({
    kind: (i === 0 ? "hero" : "detail") as "hero" | "detail",
    url,
    source: "edited" as const,
  }));
  const draft: ListingDraft = {
    id: doc.id ?? 0,
    supplierProductId: 0,
    collectionId: undefined,
    version: 1,
    title: structured?.title ?? doc.title,
    subtitle: structured?.subtitle,
    descriptionHtml: structured?.descriptionHtml ?? "",
    seoKeywords: structured?.seoKeywords ?? ["LEXI"],
    designDoc: { blocks: [] },
    renderedHtml: doc.renderedHtml ?? structured?.descriptionHtml ?? "",
    assets: images,
    aiModel: "gemini",
    status: "approved",
    createdAt: new Date().toISOString(),
  };
const factoryUsd = Number(price?.factoryUsd ?? 0);
  const jurisdiction = jurisdictionForChannel(channelCode);
  const sellUsd =
    price?.sellUsd != null && Number.isFinite(price.sellUsd)
      ? Number(price.sellUsd)
      : factoryUsd > 0
        ? computeGlobalPrice({
            productCostUsd: factoryUsd,
            shippingCostUsd: 0,
            targetCountry: jurisdiction,
            channelCode,
          }).finalPriceUsd
        : 29.9;
  const retailUsd = computeRetailPrice(sellUsd);
  const listing: Listing = {
    id: body.productId ?? doc.id ?? 0,
    draftId: draft.id,
    productSlug: `lexi-pdp-${doc.id ?? 0}`,
    marginPolicy: { type: "rate", value: 0.3, minMarginUsd: 2 },
    supplierCostUsd: factoryUsd,
    sellPriceUsd: sellUsd,
    retailPriceUsd: retailUsd,
    status: "ready",
    createdAt: new Date().toISOString(),
  };
  const channel: Channel = {
    id: 0,
    code: channelCode,
    kind: channelCode === "lexi" ? "own" : channelCode === "cafe24" ? "cafe24" : channelCode === "coupang" ? "coupang" : "marketplace",
    name: channelCode.toUpperCase(),
    config: {},
  };
  return { channel, listing, draft };
}

async function resolveExportPrice(productId: number | null | undefined): Promise<{
  factoryUsd: number;
  sellUsd: number;
} | null> {
  if (!productId || !hasDb()) return null;
  const d = db();
  const [row] = await d
    .select({
      sell: products.priceUsd,
      factory: catalogIndex.minPrice,
    })
    .from(products)
    .leftJoin(catalogIndex, eq(catalogIndex.productId, products.id))
    .where(eq(products.id, productId))
    .limit(1);
  if (!row) return null;
  const factory = Number(row.factory);
  const sellStored = Number(row.sell);
  // Import 시 저장된 price_usd(computeSellPrice) 우선 — Export 재계산으로 덮어쓰지 않음
  if (Number.isFinite(sellStored) && sellStored > 0) {
    return {
      factoryUsd: Number.isFinite(factory) && factory >= 0 ? factory : 0,
      sellUsd: sellStored,
    };
  }
  if (Number.isFinite(factory) && factory >= 0) {
    return { factoryUsd: factory, sellUsd: computeGlobalPrice({
      productCostUsd: factory,
      shippingCostUsd: 0,
      targetCountry: "KR",
      channelCode: "lexi",
    }).finalPriceUsd };
  }
  return null;
}

function shelfOptionsToExport(
  options: ShelfOption[],
  fallbackCostUsd: number,
): ListingOption[] {
  return cjOptionsToListingOptions(options, fallbackCostUsd);
}

async function resolveExportOptions(
  documentId: number,
  catalogId?: number | null,
): Promise<ListingOption[] | undefined> {
  // Export 직전 CJ live 옵션·재고 (최우선)
  if (catalogId != null) {
    const fromCj = await resolveCjExportOptions(catalogId);
    if (fromCj?.length) return fromCj;
  }

  const { getShelfByDocument } = await import("@/lib/export/shelf");
  const row = await getShelfByDocument(documentId);
  if (!row?.options?.length) return undefined;
  const fallback = Number(row.meta?.costUsd ?? 0);
  let cost = fallback;
  if (!cost && row.catalogId != null) {
    const cat = await getCatalogById(row.catalogId);
    cost = cat?.minPrice != null ? Number(cat.minPrice) : 0;
  }
  return shelfOptionsToExport(row.options, cost);
}

export type ExportOverrides = {
  options?: ListingOption[];
  pricing?: { sellPriceUsd?: number };
  extraInfo?: Record<string, string>;
};

export async function enqueueExport(opts: {
  documentId: number;
  channels: string[];
  operation?: string;
  options?: ExportOverrides["options"];
  pricing?: ExportOverrides["pricing"];
  extraInfo?: ExportOverrides["extraInfo"];
}) {
  const doc = await getPdpDocument(opts.documentId);
  if (!doc) throw new Error("document not found");
  const version = (doc as { currentVersion?: number }).currentVersion ?? 1;
  const created = [];
  const overrides: ExportOverrides = {
    options: opts.options,
    pricing: opts.pricing,
    extraInfo: opts.extraInfo,
  };

  const requestPayload = { documentId: opts.documentId, version, overrides };

  for (const channelCode of opts.channels) {
    const structured = (doc.body as { structured?: PdpStructured; assetUrls?: string[]; catalogId?: number })?.structured;
    const assetCount = ((doc.body as { assetUrls?: string[] })?.assetUrls ?? []).length;
    const catalogRow = (doc.body as { catalogId?: number })?.catalogId != null
      ? await getCatalogById((doc.body as { catalogId: number }).catalogId)
      : null;
    if (structured) {
      const gate = validateChannelExport(channelCode, structured, catalogRow, assetCount);
      if (!gate.ok) {
        throw new Error(`export validation failed (${channelCode}): ${gate.errors.join("; ")}`);
      }
    }

    const idempotencyKey = `exp:${opts.documentId}:v${version}:${channelCode}:${opts.operation ?? "create"}`;
    if (!hasDb()) {
      const existing = mem().__lexiExports!.find((j) => j.idempotencyKey === idempotencyKey);
      if (existing) {
        created.push(existing);
        continue;
      }
      const job: MemExport = {
        id: mem().__lexiExportSeq!++,
        documentId: opts.documentId,
        documentVersion: version,
        channelCode,
        operation: opts.operation ?? "create",
        status: "queued",
        idempotencyKey,
        attemptCount: 0,
        maxAttempts: 5,
        requestPayload,
        responsePayload: null,
        artifactUrl: null,
        externalRef: null,
        lastError: null,
        createdAt: new Date(),
        completedAt: null,
      };
      mem().__lexiExports!.push(job);
      persistExports();
      created.push(job);
    } else {
      const [existing] = await db()
        .select()
        .from(exportJobs)
        .where(eq(exportJobs.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) {
        created.push(existing);
        continue;
      }
      const [job] = await db()
        .insert(exportJobs)
        .values({
          documentId: opts.documentId,
          documentVersion: version,
          channelCode,
          operation: opts.operation ?? "create",
          status: "queued",
          idempotencyKey,
          requestPayload,
          nextAttemptAt: new Date(),
        })
        .returning();
      created.push(job);
    }
  }
  return created;
}

async function runOne(job: {
  id: number;
  documentId: number;
  channelCode: string;
  documentVersion: number;
}) {
  const doc = await getPdpDocument(job.documentId);
  if (!doc) throw new Error("document missing");
  const body = (doc.body ?? {}) as {
    structured?: PdpStructured;
    assetUrls?: string[];
    productId?: number | null;
    catalogId?: number;
  };
  const structured = body.structured;
  const safeAssets = safeImages(body.assetUrls ?? []);

  if (structured) {
    const catalogRow = body.catalogId != null ? await getCatalogById(body.catalogId) : null;
    const gate = validateChannelExport(job.channelCode, structured, catalogRow, safeAssets.length);
    if (!gate.ok) {
      throw new Error(`channel gate (${job.channelCode}): ${gate.errors.join("; ")}`);
    }
    const channelErrs = validatePdpForChannel(job.channelCode, structured);
    if (channelErrs.length) throw new Error(channelErrs.join("; "));
    const baseErrs = validatePdp(structured);
    if (baseErrs.length) throw new Error(baseErrs.join("; "));
  }

  if (job.channelCode === "alibaba_package") {
    const artifact = {
      brand: "LEXI",
      title: body.structured?.title ?? (doc as { title: string }).title,
      html: (doc as { renderedHtml?: string | null }).renderedHtml,
      images: safeAssets,
      version: job.documentVersion,
      exportedAt: new Date().toISOString(),
    };
    return {
      mock: false,
      publishState: "package",
      externalRef: `ALI-PKG-${job.documentId}-v${job.documentVersion}`,
      artifactUrl: `data:application/json;base64,${Buffer.from(JSON.stringify(artifact)).toString("base64")}`,
      response: { package: true },
    };
  }

  const adapterCode = job.channelCode === "lexi" ? "lexi" : job.channelCode;
  const adapter = getChannelAdapter(adapterCode);
  if (!adapter) throw new Error(`unknown channel ${job.channelCode}`);

const resolved = await resolveExportPrice(body.productId ?? null);

  const input = toPublishInput(
    {
      id: (doc as { id?: number }).id,
      title: (doc as { title: string }).title,
      renderedHtml: (doc as { renderedHtml?: string | null }).renderedHtml,
      body: doc.body,
    },
    adapterCode,
    resolved ?? undefined,
  );
  (input.draft as ListingDraft & { structured?: PdpStructured; catalogId?: number }).structured = structured;
  if (body.catalogId != null) {
    (input.draft as ListingDraft & { catalogId?: number }).catalogId = body.catalogId;
  }
  input.draft.assets = safeAssets.map((url, i) => ({
    kind: (i === 0 ? "hero" : "detail") as "hero" | "detail",
    url,
    source: "edited" as const,
  }));
  input.draft.renderedHtml = (doc as { renderedHtml?: string | null }).renderedHtml ?? input.draft.renderedHtml;

// P5: 옵션/가격/기타정보 — enqueue 때 저장된 overrides를 어댑터에 전달
  const payload = job as unknown as { requestPayload?: { overrides?: ExportOverrides } };
  const overrides = payload.requestPayload?.overrides;
  if (overrides?.options?.length) {
    input.options = overrides.options;
  } else {
    const fromShelf = await resolveExportOptions(job.documentId, body.catalogId);
    if (fromShelf?.length) input.options = fromShelf;
  }
  if (overrides?.extraInfo) input.extraInfo = overrides.extraInfo;
  if (overrides?.pricing?.sellPriceUsd) {
    input.pricing = { sellPriceUsd: overrides.pricing.sellPriceUsd };
    input.listing = { ...input.listing, sellPriceUsd: overrides.pricing.sellPriceUsd };
  }
  if (overrides?.extraInfo) input.draft = { ...input.draft, extraInfo: overrides.extraInfo };

  // LEXI: 최적본 이미지 + 판매가 공식 반영
  if (job.channelCode === "lexi" && hasDb() && body.productId) {
    const d = db();
    await d.delete(productImages).where(eq(productImages.productId, body.productId));
    let sort = 0;
    for (const url of safeAssets.slice(0, 8)) {
      await d.insert(productImages).values({ productId: body.productId!, url, sort: sort++, isDummy: false });
    }
    const productPatch: Record<string, unknown> = {
      ...(body.structured?.title ? { name: body.structured.title } : {}),
      ...(body.structured?.descriptionHtml ? { description: body.structured.descriptionHtml } : {}),
      priceUsd: String(input.listing.sellPriceUsd),
    };
    try {
      await d
        .update(products)
        .set({ ...productPatch, retailPriceUsd: String(input.listing.retailPriceUsd) })
        .where(eq(products.id, body.productId));
    } catch {
      await d.update(products).set(productPatch).where(eq(products.id, body.productId));
    }
  }

  const result = await adapter.publish(input);
  const ref = result.externalRef;
  const isMock = /MOCK/i.test(ref);
  const isPreview = /PREVIEW/i.test(ref);
  return {
    mock: isMock,
    publishState: isMock ? "mock_ok" : isPreview ? "preview_ok" : "live",
    externalRef: ref,
    response: result,
  };
}

export async function processExportQueue(limit = 10) {
  const jobs = !hasDb()
    ? (mem().__lexiExports ?? []).filter((j) => j.status === "queued" || j.status === "retry").slice(0, limit)
    : await db()
        .select()
        .from(exportJobs)
        .where(
          and(
            or(eq(exportJobs.status, "queued"), eq(exportJobs.status, "retry"))!,
            or(sql`${exportJobs.nextAttemptAt} is null`, lte(exportJobs.nextAttemptAt, new Date()))!,
          ),
        )
        .limit(limit);

  const results = [];
  for (const job of jobs) {
    const attempt = job.attemptCount + 1;
    try {
      const result = await runOne(job);
      if (!hasDb()) {
        Object.assign(job as MemExport, {
          status: "done",
          attemptCount: attempt,
          responsePayload: result,
          externalRef: result.externalRef,
          artifactUrl: result.artifactUrl ?? null,
          completedAt: new Date(),
          lastError: null,
        });
        persistExports();
      } else {
        await db()
          .update(exportJobs)
          .set({
            status: "done",
            attemptCount: attempt,
            responsePayload: result,
            externalRef: result.externalRef,
            artifactUrl: result.artifactUrl ?? null,
            completedAt: new Date(),
            lastError: null,
          })
          .where(eq(exportJobs.id, job.id));
      }
      results.push({ id: job.id, ok: true, ...result });
      try {
        const { upsertChannelListingFromExport } = await import("@/lib/hq/listing-stats");
        await upsertChannelListingFromExport({
          channelCode: job.channelCode,
          documentId: job.documentId,
          publishState: String(result.publishState ?? "live"),
          externalRef: result.externalRef,
        });
      } catch {
        /* listing mirror best-effort */
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      const failed = attempt >= job.maxAttempts;
      const next = new Date(Date.now() + Math.min(60_000, 1000 * 2 ** attempt));
      if (!hasDb()) {
        Object.assign(job as MemExport, {
          status: failed ? "failed" : "retry",
          attemptCount: attempt,
          lastError: err,
          completedAt: failed ? new Date() : null,
        });
        persistExports();
      } else {
        await db()
          .update(exportJobs)
          .set({
            status: failed ? "failed" : "retry",
            attemptCount: attempt,
            lastError: err,
            nextAttemptAt: failed ? null : next,
            completedAt: failed ? new Date() : null,
          })
          .where(eq(exportJobs.id, job.id));
      }
      results.push({ id: job.id, ok: false, error: err });
      try {
        const { upsertChannelListingFromExport } = await import("@/lib/hq/listing-stats");
        await upsertChannelListingFromExport({
          channelCode: job.channelCode,
          documentId: job.documentId,
          publishState: failed ? "failed" : "queued",
          error: err,
        });
      } catch {
        /* listing mirror best-effort */
      }
    }
  }
  return results;
}

export async function listExports(limit = 50) {
  await purgeMockExportJobs();
  if (!hasDb()) {
    return [...(mem().__lexiExports ?? [])].sort((a, b) => b.id - a.id).slice(0, limit);
  }
  return db().select().from(exportJobs).limit(limit);
}

function isMockExportJob(j: { externalRef?: string | null; responsePayload?: unknown; status?: string }) {
  const ref = String(j.externalRef ?? "");
  if (/MOCK/i.test(ref)) return true;
  const rp = j.responsePayload;
  if (rp && typeof rp === "object") {
    const o = rp as { externalRef?: string; publishState?: string; mock?: boolean };
    if (o.mock === true) return true;
    if (/MOCK/i.test(String(o.externalRef ?? ""))) return true;
    if (o.publishState === "mock_ok") return true;
  }
  return false;
}

/** MOCK/목업 Export 잡 영구 삭제 (로컬 메모리 + DB) */
export async function purgeMockExportJobs(): Promise<number> {
  let removed = 0;
  if (!hasDb()) {
    const before = mem().__lexiExports?.length ?? 0;
    mem().__lexiExports = (mem().__lexiExports ?? []).filter((j) => !isMockExportJob(j));
    removed = before - (mem().__lexiExports?.length ?? 0);
    if (removed) persistExports();
    return removed;
  }
  const rows = await db().select().from(exportJobs).limit(500);
  const ids = rows.filter((j) => isMockExportJob(j)).map((j) => j.id);
  if (!ids.length) return 0;
  const { inArray } = await import("drizzle-orm");
  await db().delete(exportJobs).where(inArray(exportJobs.id, ids));
  return ids.length;
}

