import { and, asc, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db, hasDb } from "@/db";
import {
  contentDocuments,
  contentVersions,
  decisionQueue,
  designSections,
  designThemes,
  generationJobs,
  mediaAssets,
  publishEvents,
} from "@/db/schema";
import type { SectionPayload, ThemeTokens } from "./types";

const now = () => new Date();

export async function studioDashboard() {
  if (!hasDb()) {
    return {
      source: "preview",
      counts: { themes: 0, sections: 0, documents: 0, media: 0, jobs: 0, review: 0, published: 0 },
    };
  }
  const d = db();
  const [themes, sections, documents, media, jobs, review, published] = await Promise.all([
    d.select({ id: designThemes.id }).from(designThemes),
    d.select({ id: designSections.id }).from(designSections),
    d.select({ id: contentDocuments.id }).from(contentDocuments),
    d.select({ id: mediaAssets.id }).from(mediaAssets),
    d.select({ id: generationJobs.id }).from(generationJobs),
    d.select({ id: contentDocuments.id }).from(contentDocuments).where(eq(contentDocuments.status, "review")),
    d.select({ id: publishEvents.id }).from(publishEvents).where(eq(publishEvents.status, "published")),
  ]);
  return {
    source: "neon",
    counts: {
      themes: themes.length,
      sections: sections.length,
      documents: documents.length,
      media: media.length,
      jobs: jobs.length,
      review: review.length,
      published: published.length,
    },
  };
}

export async function listThemes() {
  if (!hasDb()) return [];
  return db().select().from(designThemes).orderBy(desc(designThemes.updatedAt));
}

export async function createTheme(input: {
  name: string;
  tokens: ThemeTokens;
  status?: string;
  actor: string;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .insert(designThemes)
    .values({
      name: input.name,
      tokens: input.tokens,
      status: input.status ?? "draft",
      createdBy: input.actor,
    })
    .returning();
  return row;
}

export async function updateTheme(
  id: number,
  patch: { name?: string; tokens?: ThemeTokens; status?: string },
) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [current] = await db().select().from(designThemes).where(eq(designThemes.id, id)).limit(1);
  if (!current) throw new Error("theme not found");
  const nextVersion = patch.tokens ? current.version + 1 : current.version;
  const [row] = await db()
    .update(designThemes)
    .set({
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.tokens ? { tokens: patch.tokens } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      version: nextVersion,
      updatedAt: now(),
    })
    .where(eq(designThemes.id, id))
    .returning();
  return row;
}

export async function listSections(opts?: { publishedOnly?: boolean }) {
  if (!hasDb()) return [];
  const d = db();
  const activeWindow = and(
    or(isNull(designSections.startsAt), lt(designSections.startsAt, now())),
    or(isNull(designSections.endsAt), gt(designSections.endsAt, now())),
  );
  return d
    .select()
    .from(designSections)
    .where(opts?.publishedOnly ? and(eq(designSections.status, "published"), activeWindow) : undefined)
    .orderBy(asc(designSections.sort), desc(designSections.updatedAt));
}

export async function createSection(input: {
  slot: string;
  title: string;
  payload: SectionPayload;
  sort?: number;
  status?: string;
  actor: string;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .insert(designSections)
    .values({
      slot: input.slot,
      title: input.title,
      payload: input.payload,
      sort: input.sort ?? 0,
      status: input.status ?? "draft",
      publishedAt: input.status === "published" ? now() : null,
      createdBy: input.actor,
    })
    .returning();
  return row;
}

export async function updateSection(
  id: number,
  patch: {
    title?: string;
    payload?: SectionPayload;
    sort?: number;
    status?: string;
    startsAt?: string | null;
    endsAt?: string | null;
  },
) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [current] = await db().select().from(designSections).where(eq(designSections.id, id)).limit(1);
  if (!current) throw new Error("section not found");
  const [row] = await db()
    .update(designSections)
    .set({
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.payload ? { payload: patch.payload, version: current.version + 1 } : {}),
      ...(patch.sort !== undefined ? { sort: patch.sort } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.startsAt !== undefined
        ? { startsAt: patch.startsAt ? new Date(patch.startsAt) : null }
        : {}),
      ...(patch.endsAt !== undefined ? { endsAt: patch.endsAt ? new Date(patch.endsAt) : null } : {}),
      ...(patch.status === "published" ? { publishedAt: now() } : {}),
      updatedAt: now(),
    })
    .where(eq(designSections.id, id))
    .returning();
  return row;
}

export async function listDocuments(filter?: { status?: string; kind?: string }) {
  if (!hasDb()) return [];
  const conditions = [
    filter?.status ? eq(contentDocuments.status, filter.status) : undefined,
    filter?.kind ? eq(contentDocuments.kind, filter.kind) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];
  return db()
    .select()
    .from(contentDocuments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(contentDocuments.updatedAt));
}

export async function createDocument(input: {
  kind: string;
  title: string;
  locale?: string;
  cafe24ProductNo?: number;
  body: Record<string, unknown>;
  renderedHtml?: string;
  actor: string;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .insert(contentDocuments)
    .values({
      kind: input.kind,
      title: input.title,
      locale: input.locale ?? "ko",
      cafe24MallId: process.env.CAFE24_MALL_ID || null,
      cafe24ShopNo: Number(process.env.CAFE24_SHOP_NO || 1),
      cafe24ProductNo: input.cafe24ProductNo,
      body: input.body,
      renderedHtml: input.renderedHtml,
      createdBy: input.actor,
    })
    .returning();
  await snapshotDocument(row.id, input.actor, "created");
  return row;
}

export async function updateDocument(
  id: number,
  patch: {
    title?: string;
    body?: Record<string, unknown>;
    renderedHtml?: string;
    status?: string;
    actor: string;
  },
) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [current] = await db()
    .select()
    .from(contentDocuments)
    .where(eq(contentDocuments.id, id))
    .limit(1);
  if (!current) throw new Error("document not found");
  if (current.status === "published" && patch.status === "published") {
    throw new Error("published document must create a new version before republish");
  }
  const nextVersion = patch.body || patch.renderedHtml ? current.currentVersion + 1 : current.currentVersion;
  const [row] = await db()
    .update(contentDocuments)
    .set({
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.body ? { body: patch.body } : {}),
      ...(patch.renderedHtml !== undefined ? { renderedHtml: patch.renderedHtml } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.status === "approved"
        ? { reviewedBy: patch.actor, reviewedAt: now() }
        : {}),
      currentVersion: nextVersion,
      updatedAt: now(),
    })
    .where(eq(contentDocuments.id, id))
    .returning();
  if (nextVersion !== current.currentVersion || patch.status) {
    await snapshotDocument(id, patch.actor, patch.status ?? "updated");
  }
  return row;
}

export async function snapshotDocument(documentId: number, actor: string, note?: string) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [doc] = await db()
    .select()
    .from(contentDocuments)
    .where(eq(contentDocuments.id, documentId))
    .limit(1);
  if (!doc) throw new Error("document not found");
  const existing = await db()
    .select({ id: contentVersions.id })
    .from(contentVersions)
    .where(
      and(
        eq(contentVersions.documentId, documentId),
        eq(contentVersions.version, doc.currentVersion),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db()
    .insert(contentVersions)
    .values({
      documentId,
      version: doc.currentVersion,
      body: doc.body,
      renderedHtml: doc.renderedHtml,
      status: doc.status,
      note,
      createdBy: actor,
    })
    .returning();
  return row;
}

export async function listMedia() {
  if (!hasDb()) return [];
  return db().select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
}

export async function createMedia(input: {
  kind: string;
  name: string;
  url: string;
  mimeType?: string;
  alt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  actor: string;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .insert(mediaAssets)
    .values({
      kind: input.kind,
      name: input.name,
      url: input.url,
      mimeType: input.mimeType,
      alt: input.alt,
      tags: input.tags,
      metadata: input.metadata,
      createdBy: input.actor,
    })
    .returning();
  return row;
}

export async function listJobs() {
  if (!hasDb()) return [];
  return db().select().from(generationJobs).orderBy(desc(generationJobs.createdAt));
}

export async function createJob(input: {
  kind: string;
  cafe24ProductNo?: number;
  documentId?: number;
  payload: Record<string, unknown>;
  actor: string;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [job] = await db()
    .insert(generationJobs)
    .values({
      kind: input.kind,
      cafe24ProductNo: input.cafe24ProductNo,
      documentId: input.documentId,
      input: input.payload,
      requestedBy: input.actor,
    })
    .returning();
  return job;
}

export async function updateJob(
  id: number,
  patch: { status: string; output?: Record<string, unknown>; error?: string },
) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .update(generationJobs)
    .set({
      status: patch.status,
      ...(patch.output ? { output: patch.output } : {}),
      ...(patch.error ? { error: patch.error } : {}),
      ...(patch.status === "processing" ? { startedAt: now() } : {}),
      ...(["completed", "failed", "cancelled"].includes(patch.status)
        ? { completedAt: now() }
        : {}),
    })
    .where(eq(generationJobs.id, id))
    .returning();
  if (!row) throw new Error("job not found");
  return row;
}

export async function listPublishEvents() {
  if (!hasDb()) return [];
  return db().select().from(publishEvents).orderBy(desc(publishEvents.createdAt));
}

export async function recordPublishMetrics(
  id: number,
  metrics: { impressions?: number; clicks?: number; conversions?: number; revenue?: number },
) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .update(publishEvents)
    .set({ metrics })
    .where(eq(publishEvents.id, id))
    .returning();
  if (!row) throw new Error("publish event not found");
  return row;
}

export async function listDecisions() {
  if (!hasDb()) return [];
  return db().select().from(decisionQueue).orderBy(asc(decisionQueue.code));
}

export async function createDecision(input: {
  code: string;
  priority?: string;
  question: string;
  defaultDecision: string;
  impact?: string;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .insert(decisionQueue)
    .values({
      code: input.code,
      priority: input.priority ?? "medium",
      question: input.question,
      defaultDecision: input.defaultDecision,
      impact: input.impact,
    })
    .onConflictDoUpdate({
      target: decisionQueue.code,
      set: {
        question: input.question,
        defaultDecision: input.defaultDecision,
        priority: input.priority ?? "medium",
        impact: input.impact,
      },
    })
    .returning();
  return row;
}

export async function resolveDecision(
  id: number,
  input: { finalDecision: string; actor: string },
) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const [row] = await db()
    .update(decisionQueue)
    .set({
      finalDecision: input.finalDecision,
      status: "resolved",
      resolvedBy: input.actor,
      resolvedAt: now(),
    })
    .where(eq(decisionQueue.id, id))
    .returning();
  if (!row) throw new Error("decision not found");
  return row;
}
