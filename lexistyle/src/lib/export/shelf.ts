/** Export 진열 큐 — crafted → priced → shelf */
import { desc, eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { exportShelf } from "@/db/schema";
import { localStore, scheduleLocalPersist } from "@/lib/local-store";
import { computeSellPrice } from "@/lib/hq/types";
import { getCatalogById } from "@/lib/catalog/index-store";
import { getPdpDocument } from "@/lib/pdp/generate";
import { translateProductTitleKo } from "@/lib/catalog/title-ko";
import { mapCjVariantsToOptions } from "@/lib/catalog/cj-options";

export type ShelfStage = "crafted" | "priced" | "shelf";

export type ShelfOption = {
  sku?: string;
  name: string;
  stock: number;
  costUsd?: number;
  attributes?: Record<string, string>;
};

export type ShelfRow = {
  id: number;
  documentId: number;
  catalogId: number | null;
  stage: ShelfStage;
  title: string | null;
  titleKo: string | null;
  thumbUrl: string | null;
  sellPriceUsd: string | null;
  stockDefault: number;
  options: ShelfOption[] | null;
  channelsDesired: string[] | null;
  meta: Record<string, unknown> | null;
  updatedAt: Date;
  createdAt: Date;
};

type G = typeof globalThis & {
  __lexiShelf?: ShelfRow[];
  __lexiShelfSeq?: number;
  __lexiShelfHydrated?: boolean;
  __lexiShelfDbOff?: boolean;
};

function mem() {
  const g = globalThis as G;
  if (!g.__lexiShelfHydrated) {
    const s = localStore() as { exportShelf?: ShelfRow[]; exportShelfSeq?: number };
    g.__lexiShelf = (s.exportShelf ?? []).map((r) => ({
      ...r,
      updatedAt: new Date(r.updatedAt),
      createdAt: new Date(r.createdAt),
    }));
    g.__lexiShelfSeq = s.exportShelfSeq ?? 1;
    g.__lexiShelfHydrated = true;
  }
  if (!g.__lexiShelf) g.__lexiShelf = [];
  if (!g.__lexiShelfSeq) g.__lexiShelfSeq = 1;
  return g;
}

function useDb() {
  return hasDb() && !(globalThis as G).__lexiShelfDbOff;
}

function disableDb() {
  (globalThis as G).__lexiShelfDbOff = true;
}

function persist() {
  const g = mem();
  const s = localStore() as { exportShelf?: ShelfRow[]; exportShelfSeq?: number };
  s.exportShelf = g.__lexiShelf;
  s.exportShelfSeq = g.__lexiShelfSeq;
  scheduleLocalPersist();
}

function mapDb(r: typeof exportShelf.$inferSelect): ShelfRow {
  return {
    id: r.id,
    documentId: r.documentId,
    catalogId: r.catalogId,
    stage: r.stage as ShelfStage,
    title: r.title,
    titleKo: r.titleKo,
    thumbUrl: r.thumbUrl,
    sellPriceUsd: r.sellPriceUsd,
    stockDefault: r.stockDefault,
    options: (r.options as ShelfOption[] | null) ?? null,
    channelsDesired: r.channelsDesired,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
  };
}

function variantsFromMeta(raw: unknown, fallbackCost = 0): ShelfOption[] {
  if (!raw || typeof raw !== "object") return [];
  const variants = (raw as { variants?: unknown[] }).variants;
  return mapCjVariantsToOptions(Array.isArray(variants) ? variants : [], fallbackCost);
}

export async function enqueueCrafted(documentIds: number[]): Promise<ShelfRow[]> {
  const out: ShelfRow[] = [];
  for (const documentId of documentIds) {
    const doc = await getPdpDocument(documentId);
    if (!doc) continue;
    const body = (doc.body ?? {}) as {
      catalogId?: number;
      assetUrls?: string[];
      structured?: { title?: string };
    };
    const catalogId = body.catalogId ?? (doc as { catalogId?: number }).catalogId ?? null;
    const cat = catalogId != null ? await getCatalogById(catalogId) : null;
    const title = String(doc.title ?? body.structured?.title ?? "");
    const titleKo = cat?.titleKo ?? translateProductTitleKo(title);
    const thumb =
      (Array.isArray(body.assetUrls) && body.assetUrls[0]) || cat?.primaryThumbUrl || null;
    const cost = cat?.minPrice != null ? Number(cat.minPrice) : 0;
    const sell = computeSellPrice(Number.isFinite(cost) ? cost : 0);
    const fromVariants = variantsFromMeta(cat ? (cat as { rawMeta?: unknown }).rawMeta : null, cost);
    const options: ShelfOption[] = fromVariants.length
      ? fromVariants
      : [{ name: "기본", stock: 10, costUsd: cost }];

    const existing = await findByDocument(documentId);
    if (existing) {
      out.push(
        await updateShelf(existing.id, {
          stage: existing.stage === "shelf" ? "shelf" : existing.stage === "priced" ? "priced" : "crafted",
          title,
          titleKo,
          thumbUrl: thumb,
        }),
      );
      continue;
    }

    if (!useDb()) {
      const row: ShelfRow = {
        id: mem().__lexiShelfSeq!++,
        documentId,
        catalogId,
        stage: "crafted",
        title,
        titleKo,
        thumbUrl: thumb,
        sellPriceUsd: String(sell),
        stockDefault: 10,
        options,
        channelsDesired: ["lexi"],
        meta: { costUsd: cost },
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      mem().__lexiShelf!.unshift(row);
      persist();
      out.push(row);
      continue;
    }

    try {
      const [inserted] = await db()
        .insert(exportShelf)
        .values({
          documentId,
          catalogId,
          stage: "crafted",
          title,
          titleKo,
          thumbUrl: thumb,
          sellPriceUsd: String(sell),
          stockDefault: 10,
          options,
          channelsDesired: ["lexi"],
          meta: { costUsd: cost },
        })
        .returning();
      out.push(mapDb(inserted!));
    } catch {
      disableDb();
      const row: ShelfRow = {
        id: mem().__lexiShelfSeq!++,
        documentId,
        catalogId,
        stage: "crafted",
        title,
        titleKo,
        thumbUrl: thumb,
        sellPriceUsd: String(sell),
        stockDefault: 10,
        options,
        channelsDesired: ["lexi"],
        meta: { costUsd: cost },
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      mem().__lexiShelf!.unshift(row);
      persist();
      out.push(row);
    }
  }
  return out;
}

async function findByDocument(documentId: number): Promise<ShelfRow | null> {
  if (!useDb()) {
    return mem().__lexiShelf!.find((r) => r.documentId === documentId) ?? null;
  }
  try {
    const [row] = await db()
      .select()
      .from(exportShelf)
      .where(eq(exportShelf.documentId, documentId))
      .limit(1);
    return row ? mapDb(row) : null;
  } catch {
    disableDb();
    return mem().__lexiShelf!.find((r) => r.documentId === documentId) ?? null;
  }
}

export async function getShelfByDocument(documentId: number): Promise<ShelfRow | null> {
  return findByDocument(documentId);
}

export async function listShelf(stage?: ShelfStage): Promise<ShelfRow[]> {
  if (!useDb()) {
    let rows = [...(mem().__lexiShelf ?? [])];
    if (stage) rows = rows.filter((r) => r.stage === stage);
    return rows.sort((a, b) => b.id - a.id);
  }
  try {
    const rows = stage
      ? await db().select().from(exportShelf).where(eq(exportShelf.stage, stage)).orderBy(desc(exportShelf.id))
      : await db().select().from(exportShelf).orderBy(desc(exportShelf.id));
    return rows.map(mapDb);
  } catch {
    disableDb();
    let rows = [...(mem().__lexiShelf ?? [])];
    if (stage) rows = rows.filter((r) => r.stage === stage);
    return rows.sort((a, b) => b.id - a.id);
  }
}

export async function updateShelf(
  id: number,
  patch: Partial<{
    catalogId: number | null;
    stage: ShelfStage;
    title: string | null;
    titleKo: string | null;
    thumbUrl: string | null;
    sellPriceUsd: string | number | null;
    stockDefault: number;
    options: ShelfOption[];
    channelsDesired: string[];
    meta: Record<string, unknown>;
  }>,
): Promise<ShelfRow> {
  const applyMem = () => {
    const row = mem().__lexiShelf!.find((r) => r.id === id);
    if (!row) throw new Error("shelf item not found");
    Object.assign(row, {
      ...patch,
      sellPriceUsd:
        patch.sellPriceUsd != null ? String(patch.sellPriceUsd) : row.sellPriceUsd,
      updatedAt: new Date(),
    });
    persist();
    return row;
  };
  if (!useDb()) return applyMem();
  try {
    const [row] = await db()
      .update(exportShelf)
      .set({
        ...patch,
        sellPriceUsd: patch.sellPriceUsd != null ? String(patch.sellPriceUsd) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(exportShelf.id, id))
      .returning();
    if (!row) throw new Error("shelf item not found");
    return mapDb(row);
  } catch (e) {
    if (e instanceof Error && e.message === "shelf item not found") throw e;
    disableDb();
    return applyMem();
  }
}

export async function getShelf(id: number): Promise<ShelfRow | null> {
  if (!useDb()) return mem().__lexiShelf!.find((r) => r.id === id) ?? null;
  try {
    const [row] = await db().select().from(exportShelf).where(eq(exportShelf.id, id)).limit(1);
    return row ? mapDb(row) : null;
  } catch {
    disableDb();
    return mem().__lexiShelf!.find((r) => r.id === id) ?? null;
  }
}

export async function promoteToShelf(ids: number[]): Promise<ShelfRow[]> {
  const out: ShelfRow[] = [];
  for (const id of ids) {
    out.push(await updateShelf(id, { stage: "shelf" }));
  }
  return out;
}

export async function markPriced(id: number, patch: Parameters<typeof updateShelf>[1]) {
  return updateShelf(id, { ...patch, stage: "priced" });
}
