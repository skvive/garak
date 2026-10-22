/** Catalog item → Gemini PDP → content_documents */
import { and, eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { contentDocuments, contentVersions, generationJobs } from "@/db/schema";
import { listAssetsFor, pickOptimizedUrls } from "@/lib/catalog/assets";
import { getCatalogById, patchCatalog } from "@/lib/catalog/index-store";
import { renderDesignDoc } from "@/lib/renewal/render";
import type { DesignBlock } from "@/lib/hq/types";
import type { ConceptSpec } from "@/lib/pdp/concept-spec";
import { generatePdpText as generatePdpWithGemini } from "./text-generate";
import { PDP_RULESET_ID, type PdpStructured } from "./ruleset";
import { localStore, scheduleLocalPersist, reviveDates } from "@/lib/local-store";

export type PdpDocumentMem = {
  id: number;
  title: string;
  locale: string;
  status: string;
  body: Record<string, unknown>;
  renderedHtml: string;
  catalogId: number;
  productId: number | null;
  currentVersion: number;
  rulesetId: string;
  engine: string;
  createdAt: Date;
};

const g = globalThis as unknown as {
  __lexiPdpDocs?: PdpDocumentMem[];
  __lexiPdpSeq?: number;
  __lexiPdpHydrated?: boolean;
};
function mem() {
  if (!g.__lexiPdpHydrated) {
    const s = localStore();
    g.__lexiPdpDocs = ((s.pdpDocs ?? []) as PdpDocumentMem[]).map((d) =>
      reviveDates(d as unknown as Record<string, unknown>, ["createdAt"]) as unknown as PdpDocumentMem,
    );
    g.__lexiPdpSeq = s.pdpSeq ?? 1;
    g.__lexiPdpHydrated = true;
  }
  if (!g.__lexiPdpDocs) g.__lexiPdpDocs = [];
  if (!g.__lexiPdpSeq) g.__lexiPdpSeq = 1;
  return g;
}
function persistPdp() {
  const s = localStore();
  s.pdpDocs = mem().__lexiPdpDocs;
  s.pdpSeq = mem().__lexiPdpSeq;
  scheduleLocalPersist();
}

const DEFAULT_BLOCK_PLAN = ["hero", "gallery", "usp", "story", "spec", "faq", "cta"] as const;

function storyHtml(doc: PdpStructured): string | null {
  const html = doc.descriptionHtml?.trim();
  if (html && html !== "<p></p>") return html;
  const plain = (doc as { story?: string }).story?.trim();
  return plain || null;
}

export function toBlocks(doc: PdpStructured, assetUrls: string[], conceptSpec?: ConceptSpec): DesignBlock[] {
  const idxs = (doc.galleryAssetIndexes?.length ? doc.galleryAssetIndexes : [0, 1, 2]).filter(
    (i) => i >= 0 && i < Math.max(assetUrls.length, 1),
  );
  const plan = conceptSpec?.blockPlan?.length ? conceptSpec.blockPlan : [...DEFAULT_BLOCK_PLAN];
  const story = storyHtml(doc);

  const catalog: Record<string, DesignBlock | null> = {
    hero: { type: "hero", headline: doc.title, sub: doc.subtitle, assetIndex: 0 },
    gallery: idxs.length > 1 ? { type: "gallery", assetIndexes: idxs.slice(1) } : null,
    usp: { type: "usp", items: doc.usps },
    story: story ? { type: "story", html: story } : null,
    spec: {
      type: "spec-table",
      rows: [
        ["Brand", "LEXI"],
      ],
    },
    faq: { type: "faq", items: doc.faq },
    cta: { type: "cta", label: doc.ctaLabel },
  };

  const blocks: DesignBlock[] = [];
  for (const key of plan) {
    const block = catalog[key];
    if (block) blocks.push(block);
  }
  return blocks.length ? blocks : [catalog.hero!];
}

export function renderPdp(doc: PdpStructured, assetUrls: string[], conceptSpec?: ConceptSpec) {
  const assets = assetUrls.map((url, i) => ({
    kind: (i === 0 ? "hero" : "detail") as "hero" | "detail",
    url,
    source: "edited" as const,
  }));
  if (!assets.length) {
    assets.push({
      kind: "hero",
      url: "https://picsum.photos/seed/lexi-pdp/800/800",
      source: "edited",
    });
  }
  return renderDesignDoc({ blocks: toBlocks(doc, assetUrls, conceptSpec) }, assets, {
    layoutId: conceptSpec?.layoutId,
    tokens: conceptSpec?.tokens,
  });
}

export type GeneratePdpOpts = {
  locale?: string;
  conceptSpec?: ConceptSpec;
  templateId?: number;
  extraAssetUrls?: string[];
  /** 스튜디오에서 교정한 문구 — 주면 AI 재생성 없이 이 문구 그대로 저장한다 */
  structured?: PdpStructured;
};

export async function generatePdpForCatalog(catalogId: number, opts?: GeneratePdpOpts) {
  const row = await getCatalogById(catalogId);
  if (!row) throw new Error("catalog item not found");
  if (row.importState !== "imported" && !row.primaryThumbUrl) {
    // allow generate after import preferred; still allow with thumb for demo
  }

  const conceptSpec = opts?.conceptSpec;
  const locale = opts?.locale ?? conceptSpec?.locale ?? "ko";

  const assets = await listAssetsFor(row.externalId, row.supplierCode);
  let urls = pickOptimizedUrls(
    assets.map((a) => ({
      variant: a.variant,
      optimizedUrl: (a as { optimizedUrl?: string | null }).optimizedUrl,
    })),
  );
  if (!urls.length && row.primaryThumbUrl) urls = [row.primaryThumbUrl];
  if (opts?.extraAssetUrls?.length) {
    urls = [...opts.extraAssetUrls, ...urls.filter((u) => !opts.extraAssetUrls!.includes(u))];
  }

  const { doc, engine, model } = opts?.structured
    ? { doc: opts.structured, engine: "hq-edit" as const, model: undefined }
    : await generatePdpWithGemini({
        title: row.title,
        category: (row.categoryPath ?? []).join(" > ") || "Lifestyle",
        price: `${row.currency} ${row.minPrice ?? "0"}`,
        seller: row.sellerName ?? undefined,
        locale,
        assetUrls: urls,
        voice: conceptSpec?.voice,
        copyRuleset: conceptSpec?.copyRuleset,
      });

  const html = renderPdp(doc, urls, conceptSpec);
  const fromStudio = Boolean(conceptSpec);
  const body: Record<string, unknown> = {
    rulesetId: conceptSpec?.copyRuleset ?? PDP_RULESET_ID,
    catalogId,
    productId: row.productId,
    engine,
    model: model ?? null,
    structured: doc,
    assetUrls: urls,
    designDoc: { blocks: toBlocks(doc, urls, conceptSpec) },
    /** HQ 스튜디오·공장에서 ConceptSpec과 함께 저장한 진열용 문서 */
    ...(fromStudio ? { source: "hq-studio" as const, shelfReady: true } : { source: "auto" as const }),
    ...(conceptSpec ? { conceptSpec } : {}),
    /** 스튜디오에서 교정해 저장한 초안 — "출력"하기 전에는 쇼핑몰에 노출하지 않는다 */
    ...(opts?.structured ? { studioDraft: true } : {}),
    ...(opts?.templateId != null ? { templateId: opts.templateId } : {}),
  };

  if (!hasDb()) {
    const id = mem().__lexiPdpSeq!++;
    const existingIdx = mem().__lexiPdpDocs!.findIndex((d) => d.catalogId === catalogId);
    const prevPublished = existingIdx >= 0 ? mem().__lexiPdpDocs![existingIdx]!.body?.published : undefined;
    if (prevPublished) body.published = prevPublished;
    const entry: PdpDocumentMem = {
      id: existingIdx >= 0 ? mem().__lexiPdpDocs![existingIdx]!.id : id,
      title: doc.title,
      locale,
      status: "review",
      body,
      renderedHtml: html,
      catalogId,
      productId: row.productId,
      currentVersion: existingIdx >= 0 ? mem().__lexiPdpDocs![existingIdx]!.currentVersion + 1 : 1,
      rulesetId: PDP_RULESET_ID,
      engine,
      createdAt: new Date(),
    };
    if (existingIdx >= 0) mem().__lexiPdpDocs![existingIdx] = entry;
    else mem().__lexiPdpDocs!.push(entry);
    persistPdp();
    await patchCatalog(catalogId, { documentId: entry.id });
    return { documentId: entry.id, version: entry.currentVersion, engine, title: doc.title };
  }

  const d = db();
  const [job] = await d
    .insert(generationJobs)
    .values({
      kind: "pdp",
      status: "running",
      input: { catalogId, rulesetId: PDP_RULESET_ID },
      provider: engine,
      model: model ?? "template",
      startedAt: new Date(),
    })
    .returning({ id: generationJobs.id });

  let documentId = row.documentId;
  let savedVersion = 1;
  if (documentId) {
    const [prev] = await d
      .select()
      .from(contentDocuments)
      .where(eq(contentDocuments.id, documentId))
      .limit(1);
    const nextVer = (prev?.currentVersion ?? 0) + 1;
    savedVersion = nextVer;
    // 저장은 초안만 바꾼다 — 쇼핑몰에 나가 있는 출력본(published)은 "출력"을 다시 눌러야 바뀐다
    const prevPublished = (prev?.body as Record<string, unknown> | undefined)?.published;
    if (prevPublished) body.published = prevPublished;
    await d.insert(contentVersions).values({
      documentId,
      version: nextVer,
      body,
      renderedHtml: html,
      status: "review",
      note: `regen:${engine}`,
      createdBy: "system",
    });
    await d
      .update(contentDocuments)
      .set({
        title: doc.title,
        body,
        renderedHtml: html,
        currentVersion: nextVer,
        status: "review",
        updatedAt: new Date(),
      })
      .where(eq(contentDocuments.id, documentId));
  } else {
    const [docRow] = await d
      .insert(contentDocuments)
      .values({
        kind: "pdp",
        title: doc.title,
        locale,
        status: "review",
        body,
        renderedHtml: html,
        currentVersion: 1,
        createdBy: "system",
      })
      .returning({ id: contentDocuments.id });
    documentId = docRow.id;
    await d.insert(contentVersions).values({
      documentId,
      version: 1,
      body,
      renderedHtml: html,
      status: "review",
      createdBy: "system",
    });
    await patchCatalog(catalogId, { documentId });
  }

  await d
    .update(generationJobs)
    .set({
      status: "completed",
      documentId,
      output: { engine, title: doc.title },
      completedAt: new Date(),
    })
    .where(eq(generationJobs.id, job.id));

  return { documentId, version: savedVersion, engine, title: doc.title };
}

export async function getPdpDocument(documentId: number) {
  if (!hasDb()) {
    return (mem().__lexiPdpDocs ?? []).find((d) => d.id === documentId) ?? null;
  }
  const [row] = await db().select().from(contentDocuments).where(eq(contentDocuments.id, documentId)).limit(1);
  return row ?? null;
}

/** 문서 body 일부만 갱신(버전·렌더 변경 없음) — 출력 스냅샷 기록용 */
export async function patchPdpBody(documentId: number, patch: Record<string, unknown>) {
  const doc = await getPdpDocument(documentId);
  if (!doc) throw new Error("document not found");
  const nextBody = { ...((doc.body ?? {}) as Record<string, unknown>), ...patch };
  if (!hasDb()) {
    (doc as PdpDocumentMem).body = nextBody;
    persistPdp();
    return;
  }
  await db().update(contentDocuments).set({ body: nextBody, updatedAt: new Date() }).where(eq(contentDocuments.id, documentId));
}

export async function listPdpDocuments(limit = 50) {
  if (!hasDb()) {
    return [...(mem().__lexiPdpDocs ?? [])].sort((a, b) => b.id - a.id).slice(0, limit);
  }
  return db().select().from(contentDocuments).where(eq(contentDocuments.kind, "pdp")).limit(limit);
}

export function isDummyPdpDoc(d: {
  title?: string | null;
  body?: { assetUrls?: unknown; engine?: string; source?: string; shelfReady?: boolean; conceptSpec?: unknown } | null;
  engine?: string | null;
}): boolean {
  const title = String(d.title ?? "");
  if (/LEXI Sample Product/i.test(title)) return true;
  if (/\b(dummy|fixture|seed demo)\b/i.test(title)) return true;
  const engine = String(d.engine ?? d.body?.engine ?? "");
  const assets = Array.isArray(d.body?.assetUrls) ? d.body!.assetUrls! : [];
  if (/^mock$/i.test(engine) && assets.length === 0) return true;
  return false;
}

/**
 * 진열용 = HQ 대시보드에서 AI로 생성·저장한 상품페이지만
 * (ConceptSpec 있는 스튜디오/공장 저장 · openai/gemini)
 */
export function isShelfReadyPdp(d: {
  title?: string | null;
  body?: {
    assetUrls?: unknown;
    engine?: string;
    source?: string;
    shelfReady?: boolean;
    conceptSpec?: unknown;
  } | null;
  engine?: string | null;
}): boolean {
  if (isDummyPdpDoc(d)) return false;
  const body = d.body ?? {};
  if (body.shelfReady === true || body.source === "hq-studio") return true;
  const engine = String(d.engine ?? body.engine ?? "").toLowerCase();
  if (engine === "template" || engine === "mock") return false;
  // 레거시: conceptSpec + AI 엔진
  if (body.conceptSpec && (engine === "openai" || engine === "gemini")) return true;
  return false;
}

/** 샘플/더미 PDP 문서 삭제 — Export 목록에서 제거 */
export async function purgeDummyPdpDocuments(): Promise<number> {
  if (!hasDb()) {
    const before = mem().__lexiPdpDocs?.length ?? 0;
    mem().__lexiPdpDocs = (mem().__lexiPdpDocs ?? []).filter((d) => !isDummyPdpDoc(d));
    const removed = before - (mem().__lexiPdpDocs?.length ?? 0);
    if (removed) persistPdp();
    return removed;
  }
  const rows = await db().select().from(contentDocuments).where(eq(contentDocuments.kind, "pdp")).limit(500);
  const ids = rows.filter((d) => isDummyPdpDoc(d as never)).map((d) => d.id);
  if (!ids.length) return 0;
  const { inArray } = await import("drizzle-orm");
  await db().delete(contentDocuments).where(inArray(contentDocuments.id, ids));
  return ids.length;
}

/** 진열 비대상(template/auto) 문서 삭제 — PDP 하단·Export를 비우고 스튜디오 생성분만 남김 */
export async function purgeNonShelfPdpDocuments(): Promise<number> {
  if (!hasDb()) {
    const before = mem().__lexiPdpDocs?.length ?? 0;
    mem().__lexiPdpDocs = (mem().__lexiPdpDocs ?? []).filter((d) => isShelfReadyPdp(d));
    const removed = before - (mem().__lexiPdpDocs?.length ?? 0);
    if (removed) persistPdp();
    return removed;
  }
  const rows = await db().select().from(contentDocuments).where(eq(contentDocuments.kind, "pdp")).limit(500);
  const ids = rows.filter((d) => !isShelfReadyPdp(d as never)).map((d) => d.id);
  if (!ids.length) return 0;
  const { inArray } = await import("drizzle-orm");
  await db().delete(contentDocuments).where(inArray(contentDocuments.id, ids));
  return ids.length;
}


export async function updatePdpDocument(
  documentId: number,
  patch: { title?: string; structured?: Partial<PdpStructured>; status?: string },
) {
  const doc = await getPdpDocument(documentId);
  if (!doc) throw new Error("document not found");

  const body = (doc.body ?? {}) as Record<string, unknown>;
  const structured = {
    ...((body.structured as PdpStructured) ?? templateFromBody(body)),
    ...patch.structured,
    ...(patch.title ? { title: patch.title } : {}),
  } as PdpStructured;
  const assetUrls = (body.assetUrls as string[]) ?? [];
  const conceptSpec = body.conceptSpec as ConceptSpec | undefined;
  const html = renderPdp(structured, assetUrls, conceptSpec);
  const nextBody = { ...body, structured, designDoc: { blocks: toBlocks(structured, assetUrls, conceptSpec) } };
  const title = structured.title;

  if (!hasDb()) {
    const memDoc = doc as PdpDocumentMem;
    memDoc.title = title;
    memDoc.body = nextBody;
    memDoc.renderedHtml = html;
    memDoc.currentVersion += 1;
    if (patch.status) memDoc.status = patch.status;
    persistPdp();
    return memDoc;
  }

  const d = db();
  const nextVer = (doc as { currentVersion: number }).currentVersion + 1;
  await d.insert(contentVersions).values({
    documentId,
    version: nextVer,
    body: nextBody,
    renderedHtml: html,
    status: patch.status ?? (doc as { status: string }).status,
    note: "manual-edit",
    createdBy: "admin",
  });
  await d
    .update(contentDocuments)
    .set({
      title,
      body: nextBody,
      renderedHtml: html,
      currentVersion: nextVer,
      status: patch.status ?? (doc as { status: string }).status,
      updatedAt: new Date(),
    })
    .where(eq(contentDocuments.id, documentId));
  return getPdpDocument(documentId);
}

function templateFromBody(body: Record<string, unknown>): PdpStructured {
  return {
    title: String((body as { title?: string }).title ?? "LEXI Product"),
    subtitle: "",
    descriptionHtml: "<p></p>",
    usps: ["", "", ""],
    faq: [
      { q: "", a: "" },
      { q: "", a: "" },
    ],
    ctaLabel: "Add to bag",
    seoKeywords: [],
    galleryAssetIndexes: [0],
  };
}

export async function getPdpByProductId(productId: number) {
  if (!hasDb()) {
    return (mem().__lexiPdpDocs ?? []).find((d) => d.productId === productId) ?? null;
  }
  const [row] = await db()
    .select()
    .from(contentDocuments)
    .where(
      and(
        eq(contentDocuments.kind, "pdp"),
        sql`${contentDocuments.body}->>'productId' = ${String(productId)}`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPdpBySlugHint(slug: string) {
  const docs = await listPdpDocuments(100);
  return (
    docs.find((d) => {
      const title = (d as { title: string }).title?.toLowerCase() ?? "";
      return slug.includes("hq") === false && title && slug.replace(/-/g, " ").includes(title.slice(0, 12).toLowerCase());
    }) ?? null
  );
}

export async function batchEditPdp(
  documentIds: number[],
  rule: { ctaLabel?: string; tonePrefix?: string; status?: string },
) {
  const out = [];
  for (const id of documentIds) {
    try {
      const doc = await getPdpDocument(id);
      if (!doc) throw new Error("missing");
      const structured = ((doc.body as { structured?: PdpStructured })?.structured ??
        templateFromBody(doc.body as Record<string, unknown>)) as PdpStructured;
      if (rule.ctaLabel) structured.ctaLabel = rule.ctaLabel;
      if (rule.tonePrefix) {
        structured.subtitle = `${rule.tonePrefix} ${structured.subtitle}`.trim();
      }
      await updatePdpDocument(id, { structured, status: rule.status });
      out.push({ id, ok: true });
    } catch (e) {
      out.push({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
