/** catalog_index 저장소 — Neon / 로컬 Postgres / 파일 DB 폴백 */
import { and, asc, desc, eq, gt, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import {
  catalogIndex,
  catalogSyncCheckpoints,
  catalogSyncRuns,
} from "@/db/schema";
import { catalogHash } from "./cj-schema";
import {
  resolveCjChipFilter,
} from "./lexi-cj-categories";
import { localStore, scheduleLocalPersist, reviveDates } from "@/lib/local-store";
import { stockAlertOf, STOCK_LOW_MAX, STOCK_UNKNOWN, type StockAlert } from "./stock-alert";
import { cjCanonicalSql, collapseCjCategories, mapCjCategory } from "./cj-categories";
import { translateProductTitleKo } from "./title-ko";

export type CatalogRow = {
  id: number;
  supplierCode: string;
  externalId: string;
  title: string;
  titleKo?: string | null;
  categoryPath: string[] | null;
  minPrice: string | null;
  maxPrice: string | null;
  currency: string;
  stock: number;
  primaryThumbUrl: string | null;
  sellerName: string | null;
  sourceUrl: string | null;
  searchableText: string | null;
  contentHash: string | null;
  sourceStatus: string;
  importState: string;
  productId: number | null;
  documentId: number | null;
  indexedAt: Date;
  updatedAt: Date;
  rawMeta?: unknown;
};

export type CatalogProviderSeed = {
  sellerName: string | null;
  rawMeta: unknown;
  sourceUrl: string | null;
  thumbUrl: string | null;
};

type MemCatalog = CatalogRow & { rawMeta?: unknown; syncRunId?: number | null };
type MemCp = { supplierCode: string; nextPage: number; pageSize: number; runId: number | null };
type MemRun = {
  id: number;
  supplierCode: string;
  status: string;
  pagesDone: number;
  itemsUpserted: number;
  lastError: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

const g = globalThis as unknown as {
  __lexiCatalog?: MemCatalog[];
  __lexiCatalogCp?: MemCp[];
  __lexiCatalogRuns?: MemRun[];
  __lexiCatalogSeq?: number;
  __lexiCatalogHydrated?: boolean;
};

function mem() {
  if (!g.__lexiCatalogHydrated) {
    const s = localStore();
    g.__lexiCatalog = ((s.catalog ?? []) as MemCatalog[]).map((r) =>
      reviveDates(r as unknown as Record<string, unknown>, ["indexedAt", "updatedAt"]) as unknown as MemCatalog,
    );
    g.__lexiCatalogCp = (s.catalogCp ?? []) as MemCp[];
    g.__lexiCatalogRuns = ((s.catalogRuns ?? []) as MemRun[]).map((r) =>
      reviveDates(r as unknown as Record<string, unknown>, ["startedAt", "finishedAt"]) as unknown as MemRun,
    );
    g.__lexiCatalogSeq = s.catalogSeq ?? 1;
    g.__lexiCatalogHydrated = true;
  }
  if (!g.__lexiCatalog) g.__lexiCatalog = [];
  if (!g.__lexiCatalogCp) g.__lexiCatalogCp = [];
  if (!g.__lexiCatalogRuns) g.__lexiCatalogRuns = [];
  if (!g.__lexiCatalogSeq) g.__lexiCatalogSeq = 1;
  return g;
}

function persistMem() {
  const s = localStore();
  s.catalog = mem().__lexiCatalog;
  s.catalogCp = mem().__lexiCatalogCp;
  s.catalogRuns = mem().__lexiCatalogRuns;
  s.catalogSeq = mem().__lexiCatalogSeq;
  scheduleLocalPersist();
}

function nextMemId() {
  return mem().__lexiCatalogSeq!++;
}

export type UpsertInput = {
  supplierCode: string;
  externalId: string;
  title: string;
  categoryPath?: string[];
  price: number;
  currency?: string;
  stock?: number;
  primaryThumbUrl?: string | null;
  sellerName?: string | null;
  sourceUrl?: string | null;
  rawMeta?: unknown;
  syncRunId?: number | null;
};

export async function upsertCatalogMeta(input: UpsertInput): Promise<"created" | "updated" | "unchanged"> {
  const hash = catalogHash({
    title: input.title,
    price: input.price,
    stock: input.stock ?? STOCK_UNKNOWN,
    thumb: input.primaryThumbUrl,
  });
  const titleKo = translateProductTitleKo(input.title);
  const searchable = [input.title, titleKo, ...(input.categoryPath ?? []), input.sellerName ?? ""]
    .join(" ")
    .toLowerCase();

  if (!hasDb()) {
    const rows = mem().__lexiCatalog!;
    const existing = rows.find(
      (r) => r.supplierCode === input.supplierCode && r.externalId === input.externalId,
    );
    if (!existing) {
      rows.push({
        id: nextMemId(),
        supplierCode: input.supplierCode,
        externalId: input.externalId,
        title: input.title,
        titleKo,
        categoryPath: input.categoryPath ?? [],
        minPrice: String(input.price),
        maxPrice: String(input.price),
        currency: input.currency ?? "USD",
        stock: input.stock ?? STOCK_UNKNOWN,
        primaryThumbUrl: input.primaryThumbUrl ?? null,
        sellerName: input.sellerName ?? null,
        sourceUrl: input.sourceUrl ?? null,
        searchableText: searchable,
        contentHash: hash,
        sourceStatus: "active",
        importState: "none",
        productId: null,
        documentId: null,
        indexedAt: new Date(),
        updatedAt: new Date(),
        rawMeta: input.rawMeta,
        syncRunId: input.syncRunId ?? null,
      });
      persistMem();
      return "created";
    }
    if (existing.contentHash === hash) {
      const sellerChanged = Boolean(input.sellerName && input.sellerName !== existing.sellerName);
      existing.updatedAt = new Date();
      existing.sourceStatus = "active";
      existing.syncRunId = input.syncRunId ?? existing.syncRunId;
      if (sellerChanged) existing.sellerName = input.sellerName ?? existing.sellerName;
      if (!existing.titleKo) existing.titleKo = titleKo;
      if (input.rawMeta) existing.rawMeta = mergeCatalogRawMeta(existing.rawMeta, input.rawMeta);
      persistMem();
      return sellerChanged || input.rawMeta ? "updated" : "unchanged";
    }
    Object.assign(existing, {
      title: input.title,
      titleKo,
      categoryPath: input.categoryPath ?? existing.categoryPath,
      minPrice: String(input.price),
      maxPrice: String(input.price),
      stock: input.stock !== undefined ? input.stock : existing.stock,
      primaryThumbUrl: input.primaryThumbUrl ?? existing.primaryThumbUrl,
      sellerName: input.sellerName ?? existing.sellerName,
      sourceUrl: input.sourceUrl ?? existing.sourceUrl,
      searchableText: searchable,
      contentHash: hash,
      sourceStatus: "active",
      syncRunId: input.syncRunId ?? existing.syncRunId,
      updatedAt: new Date(),
      ...(input.rawMeta ? { rawMeta: mergeCatalogRawMeta(existing.rawMeta, input.rawMeta) } : {}),
    });
    persistMem();
    return "updated";
  }

  const d = db();
  const [existing] = await d
    .select({ id: catalogIndex.id, contentHash: catalogIndex.contentHash })
    .from(catalogIndex)
    .where(
      and(
        eq(catalogIndex.supplierCode, input.supplierCode),
        eq(catalogIndex.externalId, input.externalId),
      ),
    )
    .limit(1);

  if (!existing) {
    await d.insert(catalogIndex).values({
      supplierCode: input.supplierCode,
      externalId: input.externalId,
      title: input.title,
      categoryPath: input.categoryPath ?? [],
      minPrice: String(input.price),
      maxPrice: String(input.price),
      currency: input.currency ?? "USD",
      stock: input.stock ?? STOCK_UNKNOWN,
      primaryThumbUrl: input.primaryThumbUrl ?? null,
      sellerName: input.sellerName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      searchableText: searchable,
      contentHash: hash,
      syncRunId: input.syncRunId ?? null,
      rawMeta: input.rawMeta ?? null,
    });
    return "created";
  }
  if (existing.contentHash === hash) {
    const [cur] = await d
      .select({ rawMeta: catalogIndex.rawMeta })
      .from(catalogIndex)
      .where(eq(catalogIndex.id, existing.id))
      .limit(1);
    await d
      .update(catalogIndex)
      .set({
        updatedAt: new Date(),
        sourceStatus: "active",
        syncRunId: input.syncRunId ?? null,
        searchableText: searchable,
        ...(input.sellerName ? { sellerName: input.sellerName } : {}),
        ...(input.rawMeta ? { rawMeta: mergeCatalogRawMeta(cur?.rawMeta, input.rawMeta) } : {}),
      })
      .where(eq(catalogIndex.id, existing.id));
    return input.sellerName || input.rawMeta ? "updated" : "unchanged";
  }
  const [cur] = await d
    .select({ rawMeta: catalogIndex.rawMeta })
    .from(catalogIndex)
    .where(eq(catalogIndex.id, existing.id))
    .limit(1);
  await d
    .update(catalogIndex)
    .set({
      title: input.title,
      categoryPath: input.categoryPath ?? [],
      minPrice: String(input.price),
      maxPrice: String(input.price),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      primaryThumbUrl: input.primaryThumbUrl ?? null,
      sellerName: input.sellerName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      searchableText: searchable,
      contentHash: hash,
      sourceStatus: "active",
      syncRunId: input.syncRunId ?? null,
      rawMeta: input.rawMeta ? mergeCatalogRawMeta(cur?.rawMeta, input.rawMeta) : cur?.rawMeta ?? null,
      updatedAt: new Date(),
    })
    .where(eq(catalogIndex.id, existing.id));
  return "updated";
}

/** 크롤 rawMeta가 warehouses·stockVerified를 덮어쓰지 않게 병합 */
function mergeCatalogRawMeta(prev: unknown, next: unknown): Record<string, unknown> {
  const a = prev && typeof prev === "object" ? (prev as Record<string, unknown>) : {};
  const b = next && typeof next === "object" ? (next as Record<string, unknown>) : {};
  const out = { ...a, ...b };
  if (a.warehouses != null && b.warehouses == null) out.warehouses = a.warehouses;
  if (a.stockVerified === true && b.stockVerified !== true) out.stockVerified = true;
  return out;
}

function warehousesOf(raw: unknown): { name: string; qty: number }[] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const w = (raw as { warehouses?: { name: string; qty: number }[] }).warehouses;
  return Array.isArray(w) ? w : undefined;
}

function withStockFields<T extends { stock: number; rawMeta?: unknown }>(r: T) {
  return {
    stockAlert: stockAlertOf(r.stock, r.rawMeta),
    warehouses: warehousesOf(r.rawMeta),
  };
}

export async function searchCatalog(opts: {
  supplier?: string;
  q?: string;
  /** 카테고리 필터 — categoryPath 첫 요소 매칭 (CJ leaf) */
  category?: string;
  /** 복수 CJ leaf set — categories.slug 매칭 (mapCjCategory 결과) */
  categories?: string[];
  /** sourceStatus='gone' 포함 여부 (기본 제외) */
  includeGone?: boolean;
  /** 재고 배지 필터: unknown/out/low/ok */
  stockAlert?: "unknown" | "out" | "low" | "ok";
  /** LEXI 버킷 key — cjChips ANY 매칭 */
  lexiBucket?: string;
  /**
   * CJ 스코프: active=취급 버킷, mapped=14버킷, all=제한없음
   * lexiBucket/category 없을 때 기본 active (cjdropshipping)
   */
  scope?: "active" | "mapped" | "all";
  /** none|queued|imported|failed — 스토어 진열분만 보려면 imported */
  importState?: string;
  cursor?: number;
  limit?: number;
  /** page 기반 페이지네이션 (1부터). pageSize 기본 50. cursor와 동시 사용 시 page 우선 */
  page?: number;
  pageSize?: number;
  /** 목록 API에서는 thumb URL을 기본 제외 */
  includeThumb?: boolean;
  /** 가격 정렬 (기본 최신순) — DB에서 정렬해 페이지 경계가 정확하도록 */
  sort?: "price-asc" | "price-desc";
}): Promise<{ items: any[]; nextCursor: number | null; total: number }> {
  const chipFilter = resolveCjChipFilter({
    supplier: opts.supplier,
    category: opts.category,
    lexiBucket: opts.lexiBucket,
    scope: opts.scope,
  });
  const limit = Math.min(opts.limit ?? 40, 100);
  const cursor = opts.cursor ?? 0;
  const pageSize = opts.pageSize ?? 50;
  const page = opts.page ?? 0;

  const filterRows = (rows: CatalogRow[]) => {
    if (opts.supplier) rows = rows.filter((r) => r.supplierCode === opts.supplier);
    if (!opts.includeGone) rows = rows.filter((r) => r.sourceStatus !== "gone");
    if (opts.importState) rows = rows.filter((r) => r.importState === opts.importState);
    if (opts.categories?.length) {
      const set = new Set(opts.categories);
      rows = rows.filter((r) => set.has(mapCjCategory(r.categoryPath)));
    } else if (chipFilter !== null) {
      if (chipFilter.length === 0) {
        rows = [];
      } else {
        const set = new Set(chipFilter);
        rows = rows.filter((r) => r.categoryPath?.[0] && set.has(r.categoryPath[0]));
      }
    }
    if (opts.q) {
      const q = opts.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.searchableText ?? "").includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.titleKo ?? "").toLowerCase().includes(q),
      );
    }
    if (opts.stockAlert) rows = rows.filter((r) => stockAlertOf(r.stock, r.rawMeta) === opts.stockAlert);
    return rows;
  };

  if (!hasDb()) {
    const rows = filterRows([...(mem().__lexiCatalog ?? [])]);
    rows.sort((a, b) =>
      opts.sort === "price-asc"
        ? Number(a.minPrice ?? 0) - Number(b.minPrice ?? 0) || b.id - a.id
        : opts.sort === "price-desc"
          ? Number(b.minPrice ?? 0) - Number(a.minPrice ?? 0) || b.id - a.id
          : b.id - a.id,
    );
    const total = rows.length;
    let slice: CatalogRow[];
    if (page > 0) {
      const start = (page - 1) * pageSize;
      slice = rows.slice(start, start + pageSize);
    } else {
      slice = rows.filter((r) => r.id < (cursor || Number.MAX_SAFE_INTEGER)).slice(0, limit);
    }
    const items = slice.map((r) => {
      const { primaryThumbUrl, ...rest } = r;
      const extra = withStockFields(r);
      return opts.includeThumb ? { ...rest, primaryThumbUrl, ...extra } : { ...rest, ...extra };
    });
    const nextCursor = slice.length === limit ? slice[slice.length - 1]!.id : null;
    return { items: items as never, nextCursor, total };
  }

  const d = db();
  const conds = [];
  if (opts.supplier) conds.push(eq(catalogIndex.supplierCode, opts.supplier));
  if (!opts.includeGone) conds.push(ne(catalogIndex.sourceStatus, "gone"));
  if (opts.importState) conds.push(eq(catalogIndex.importState, opts.importState));
  if (opts.categories?.length) {
    conds.push(
      sql`${cjCanonicalSql(catalogIndex.categoryPath)} in (${sql.join(
        opts.categories.map((c) => sql`${c}`),
        sql`, `,
      )})`,
    );
  } else if (chipFilter === null) {
    /* unrestricted */
  } else if (chipFilter.length === 0) {
    conds.push(sql`false`);
  } else {
    // PG 배열은 1-based — [1]이 category_path 첫 요소(leaf). [0]은 항상 NULL.
    conds.push(
        sql`${catalogIndex.categoryPath}[1] IN (${sql.join(
        chipFilter.map((c) => sql`${c}`),
        sql`, `,
      )})`,
    );
  }
  if (cursor > 0 && page <= 0) conds.push(sql`${catalogIndex.id} < ${cursor}`);
  if (opts.q) {
    const q = `%${opts.q}%`;
    conds.push(
      or(
        ilike(catalogIndex.title, q),
        ilike(catalogIndex.searchableText, q),
      )!,
    );
  }
  if (opts.stockAlert === "unknown") {
    conds.push(sql`coalesce((${catalogIndex.rawMeta}->>'stockVerified')::boolean, false) = false`);
  }
  if (opts.stockAlert === "out") {
    conds.push(sql`(${catalogIndex.rawMeta}->>'stockVerified') = 'true' AND ${catalogIndex.stock} <= 0`);
  }
  if (opts.stockAlert === "low") {
    conds.push(
      sql`(${catalogIndex.rawMeta}->>'stockVerified') = 'true' AND ${catalogIndex.stock} > 0 AND ${catalogIndex.stock} < ${STOCK_LOW_MAX}`,
    );
  }
  if (opts.stockAlert === "ok") {
    conds.push(sql`(${catalogIndex.rawMeta}->>'stockVerified') = 'true' AND ${catalogIndex.stock} >= ${STOCK_LOW_MAX}`);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [countRows] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(catalogIndex)
    .where(where);
  const total = countRows?.n ?? 0;
  const rows = await d
    .select()
    .from(catalogIndex)
    .where(where)
    .orderBy(
      ...(opts.sort === "price-asc"
        ? [asc(catalogIndex.minPrice), desc(catalogIndex.id)]
        : opts.sort === "price-desc"
          ? [sql`${catalogIndex.minPrice} desc nulls last`, desc(catalogIndex.id)]
          : [desc(catalogIndex.id)]),
    )
    .limit(page > 0 ? pageSize : limit)
    .offset(page > 0 ? (page - 1) * pageSize : 0);

  const items = rows.map((r) => {
    const base = {
      id: r.id,
      supplierCode: r.supplierCode,
      externalId: r.externalId,
      title: r.title,
      titleKo: translateProductTitleKo(r.title),
      categoryPath: r.categoryPath,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      currency: r.currency,
      stock: r.stock,
      sellerName: r.sellerName,
      sourceUrl: r.sourceUrl,
      searchableText: r.searchableText,
      contentHash: r.contentHash,
      sourceStatus: r.sourceStatus,
      importState: r.importState,
      productId: r.productId,
      documentId: r.documentId,
      indexedAt: r.indexedAt,
      updatedAt: r.updatedAt,
      ...withStockFields(r),
    };
    return opts.includeThumb ? { ...base, primaryThumbUrl: r.primaryThumbUrl } : base;
  });
  const nextCursor = rows.length === limit ? rows[rows.length - 1]!.id : null;
  return { items, nextCursor, total };
}

export async function getCatalogById(id: number): Promise<CatalogRow | null> {
  if (!hasDb()) {
    return (mem().__lexiCatalog ?? []).find((r) => r.id === id) ?? null;
  }
  const [row] = await db().select().from(catalogIndex).where(eq(catalogIndex.id, id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    supplierCode: row.supplierCode,
    externalId: row.externalId,
    title: row.title,
    titleKo: translateProductTitleKo(row.title),
    categoryPath: row.categoryPath,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    currency: row.currency,
    stock: row.stock,
    primaryThumbUrl: row.primaryThumbUrl,
    sellerName: row.sellerName,
    sourceUrl: row.sourceUrl,
    searchableText: row.searchableText,
    contentHash: row.contentHash,
    sourceStatus: row.sourceStatus,
    importState: row.importState,
    productId: row.productId,
    documentId: row.documentId,
    indexedAt: row.indexedAt,
    updatedAt: row.updatedAt,
    rawMeta: row.rawMeta,
  };
}

export async function getCatalogByIds(ids: number[]): Promise<CatalogRow[]> {
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!uniq.length) return [];
  if (!hasDb()) {
    return (mem().__lexiCatalog ?? []).filter((r) => uniq.includes(r.id));
  }
  const rows = await db().select().from(catalogIndex).where(inArray(catalogIndex.id, uniq));
  return rows.map((row) => ({
    id: row.id,
    supplierCode: row.supplierCode,
    externalId: row.externalId,
    title: row.title,
    titleKo: translateProductTitleKo(row.title),
    categoryPath: row.categoryPath,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    currency: row.currency,
    stock: row.stock,
    primaryThumbUrl: row.primaryThumbUrl,
    sellerName: row.sellerName,
    sourceUrl: row.sourceUrl,
    searchableText: row.searchableText,
    contentHash: row.contentHash,
    sourceStatus: row.sourceStatus,
    importState: row.importState,
    productId: row.productId,
    documentId: row.documentId,
    indexedAt: row.indexedAt,
    updatedAt: row.updatedAt,
  }));
}

export async function patchCatalog(
  id: number,
  patch: Partial<Pick<CatalogRow, "importState" | "productId" | "documentId" | "sourceStatus">>,
) {
  if (!hasDb()) {
    const row = (mem().__lexiCatalog ?? []).find((r) => r.id === id);
    if (row) Object.assign(row, patch, { updatedAt: new Date() });
    persistMem();
    return;
  }
  await db()
    .update(catalogIndex)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(catalogIndex.id, id));
}

export async function getCheckpoint(supplierCode: string) {
  if (!hasDb()) {
    const cp = (mem().__lexiCatalogCp ?? []).find((c) => c.supplierCode === supplierCode);
    return cp ?? { supplierCode, nextPage: 1, pageSize: 20, runId: null as number | null };
  }
  const [row] = await db()
    .select()
    .from(catalogSyncCheckpoints)
    .where(eq(catalogSyncCheckpoints.supplierCode, supplierCode))
    .limit(1);
  return row
    ? { supplierCode: row.supplierCode, nextPage: row.nextPage, pageSize: row.pageSize, runId: row.runId }
    : { supplierCode, nextPage: 1, pageSize: 20, runId: null as number | null };
}

export async function saveCheckpoint(cp: {
  supplierCode: string;
  nextPage: number;
  pageSize: number;
  runId: number | null;
}) {
  if (!hasDb()) {
    const list = mem().__lexiCatalogCp!;
    const i = list.findIndex((c) => c.supplierCode === cp.supplierCode);
    if (i >= 0) list[i] = cp;
    else list.push(cp);
    persistMem();
    return;
  }
  const d = db();
  const [existing] = await d
    .select({ id: catalogSyncCheckpoints.id })
    .from(catalogSyncCheckpoints)
    .where(eq(catalogSyncCheckpoints.supplierCode, cp.supplierCode))
    .limit(1);
  if (existing) {
    await d
      .update(catalogSyncCheckpoints)
      .set({
        nextPage: cp.nextPage,
        pageSize: cp.pageSize,
        runId: cp.runId,
        updatedAt: new Date(),
      })
      .where(eq(catalogSyncCheckpoints.id, existing.id));
  } else {
    await d.insert(catalogSyncCheckpoints).values({
      supplierCode: cp.supplierCode,
      nextPage: cp.nextPage,
      pageSize: cp.pageSize,
      runId: cp.runId,
    });
  }
}

export async function startSyncRun(supplierCode: string): Promise<number> {
  if (!hasDb()) {
    const id = nextMemId();
    mem().__lexiCatalogRuns!.push({
      id,
      supplierCode,
      status: "running",
      pagesDone: 0,
      itemsUpserted: 0,
      lastError: null,
      startedAt: new Date(),
      finishedAt: null,
    });
    persistMem();
    return id;
  }
  const [row] = await db()
    .insert(catalogSyncRuns)
    .values({ supplierCode, status: "running" })
    .returning({ id: catalogSyncRuns.id });
  return row.id;
}

export async function finishSyncRun(
  runId: number,
  patch: { status: string; pagesDone: number; itemsUpserted: number; lastError?: string | null },
) {
  if (!hasDb()) {
    const run = (mem().__lexiCatalogRuns ?? []).find((r) => r.id === runId);
    if (run) {
      Object.assign(run, patch, { finishedAt: new Date() });
    }
    persistMem();
    return;
  }
  await db()
    .update(catalogSyncRuns)
    .set({
      status: patch.status,
      pagesDone: patch.pagesDone,
      itemsUpserted: patch.itemsUpserted,
      lastError: patch.lastError ?? null,
      finishedAt: new Date(),
    })
    .where(eq(catalogSyncRuns.id, runId));
}

export async function latestSyncRun(supplierCode: string) {
  if (!hasDb()) {
    const runs = (mem().__lexiCatalogRuns ?? [])
      .filter((r) => r.supplierCode === supplierCode)
      .sort((a, b) => b.id - a.id);
    return runs[0] ?? null;
  }
  const [row] = await db()
    .select()
    .from(catalogSyncRuns)
    .where(eq(catalogSyncRuns.supplierCode, supplierCode))
    .orderBy(desc(catalogSyncRuns.id))
    .limit(1);
  return row ?? null;
}

export async function listCatalogCategories(supplierCode?: string): Promise<{ name: string; count: number }[]> {
  if (!hasDb()) {
    const map = new Map<string, number>();
    for (const r of mem().__lexiCatalog ?? []) {
      if (supplierCode && r.supplierCode !== supplierCode) continue;
      if (r.sourceStatus === "gone") continue;
      const name = mapCjCategory(r.categoryPath);
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return collapseCjCategories([...map.entries()].map(([name, count]) => ({ name, count })));
  }
  const conds = [ne(catalogIndex.sourceStatus, "gone")];
  if (supplierCode) conds.push(eq(catalogIndex.supplierCode, supplierCode));
  // Neon/PG18: CASE+array_to_string GROUP BY 가 깨지므로 path만 가져와 JS에서 접는다
  const rows = await db()
    .select({ categoryPath: catalogIndex.categoryPath })
    .from(catalogIndex)
    .where(and(...conds));
  const map = new Map<string, number>();
  for (const r of rows) {
    const name = mapCjCategory(r.categoryPath);
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return collapseCjCategories([...map.entries()].map(([name, count]) => ({ name, count })));
}

export async function listCatalogLeafChips(supplierCode?: string): Promise<{ name: string; count: number }[]> {
  if (!hasDb()) {
    const map = new Map<string, number>();
    for (const r of mem().__lexiCatalog ?? []) {
      if (supplierCode && r.supplierCode !== supplierCode) continue;
      if (r.sourceStatus === "gone") continue;
      const name = r.categoryPath?.[0];
      if (name) map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }
  const conds = [ne(catalogIndex.sourceStatus, "gone")];
  if (supplierCode) conds.push(eq(catalogIndex.supplierCode, supplierCode));
  const rows = await db()
    .select({ categoryPath: catalogIndex.categoryPath })
    .from(catalogIndex)
    .where(and(...conds));
  const map = new Map<string, number>();
  for (const c of rows) {
    const name = c.categoryPath?.[0];
    if (name) map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function listCatalogProviderSeeds(supplierCode: string): Promise<CatalogProviderSeed[]> {
  if (!hasDb()) {
    return (mem().__lexiCatalog ?? [])
      .filter((r) => r.supplierCode === supplierCode)
      .map((r) => ({
        sellerName: r.sellerName,
        rawMeta: r.rawMeta,
        sourceUrl: r.sourceUrl,
        thumbUrl: r.primaryThumbUrl,
      }));
  }
  return db()
    .select({
      sellerName: catalogIndex.sellerName,
      rawMeta: catalogIndex.rawMeta,
      sourceUrl: catalogIndex.sourceUrl,
      thumbUrl: catalogIndex.primaryThumbUrl,
    })
    .from(catalogIndex)
    .where(eq(catalogIndex.supplierCode, supplierCode));
}

/** 이번 스윕(syncRunId)에 안 나온 SKU: 미임포트는 삭제, 임포트된 것은 gone. */
export async function pruneMissingCatalog(supplierCode: string, keepRunId: number) {
  const droppable = new Set(["none", "failed"]);
  if (!hasDb()) {
    const rows = mem().__lexiCatalog ?? [];
    const keep: MemCatalog[] = [];
    let deleted = 0;
    let markedGone = 0;
    for (const r of rows) {
      if (r.supplierCode !== supplierCode) {
        keep.push(r);
        continue;
      }
      if (r.syncRunId === keepRunId) {
        keep.push(r);
        continue;
      }
      if (droppable.has(r.importState)) {
        deleted += 1;
        continue;
      }
      markedGone += 1;
      keep.push({ ...r, sourceStatus: "gone", updatedAt: new Date() });
    }
    mem().__lexiCatalog = keep;
    persistMem();
    return { deleted, markedGone };
  }

  const missing = and(
    eq(catalogIndex.supplierCode, supplierCode),
    or(ne(catalogIndex.syncRunId, keepRunId), isNull(catalogIndex.syncRunId)),
  );
  const goneRows = await db()
    .select({ id: catalogIndex.id, importState: catalogIndex.importState })
    .from(catalogIndex)
    .where(missing);
  const deleteIds = goneRows.filter((r) => droppable.has(r.importState)).map((r) => r.id);
  const markIds = goneRows.filter((r) => !droppable.has(r.importState)).map((r) => r.id);
  if (deleteIds.length) {
    await db().delete(catalogIndex).where(inArray(catalogIndex.id, deleteIds));
  }
  if (markIds.length) {
    await db()
      .update(catalogIndex)
      .set({ sourceStatus: "gone", updatedAt: new Date() })
      .where(inArray(catalogIndex.id, markIds));
  }
  return { deleted: deleteIds.length, markedGone: markIds.length };
}

/** CJ 옵션·variants 캐시 — Export 옵션가격 단계용 */
export async function patchCatalogRawMeta(id: number, patch: Record<string, unknown>) {
  if (!hasDb()) {
    const row = (mem().__lexiCatalog ?? []).find((r) => r.id === id);
    if (!row) return null;
    const prev = row.rawMeta && typeof row.rawMeta === "object" ? (row.rawMeta as Record<string, unknown>) : {};
    row.rawMeta = mergeCatalogRawMeta(prev, patch);
    row.updatedAt = new Date();
    scheduleLocalPersist();
    return row;
  }
  const [existing] = await db().select().from(catalogIndex).where(eq(catalogIndex.id, id)).limit(1);
  if (!existing) return null;
  const rawMeta = mergeCatalogRawMeta(existing.rawMeta, patch);
  await db()
    .update(catalogIndex)
    .set({ rawMeta, updatedAt: new Date() })
    .where(eq(catalogIndex.id, id));
  return { ...existing, rawMeta };
}

export async function updateCatalogStock(
  id: number,
  stock: number,
  warehouses?: { name: string; qty: number }[],
  verified = true,
) {
  if (!hasDb()) {
    const row = (mem().__lexiCatalog ?? []).find((r) => r.id === id);
    if (!row) return null;
    row.stock = stock;
    row.updatedAt = new Date();
    const prev = row.rawMeta && typeof row.rawMeta === "object" ? (row.rawMeta as Record<string, unknown>) : {};
    row.rawMeta = {
      ...prev,
      stockVerified: verified,
      ...(warehouses ? { warehouses } : {}),
    };
    scheduleLocalPersist();
    return row;
  }
  const [existing] = await db().select().from(catalogIndex).where(eq(catalogIndex.id, id)).limit(1);
  if (!existing) return null;
  const prev = existing.rawMeta && typeof existing.rawMeta === "object" ? (existing.rawMeta as Record<string, unknown>) : {};
  const rawMeta = {
    ...prev,
    stockVerified: verified,
    ...(warehouses ? { warehouses } : {}),
  };
  await db()
    .update(catalogIndex)
    .set({ stock, rawMeta, updatedAt: new Date() })
    .where(eq(catalogIndex.id, id));
  return { ...existing, stock, rawMeta };
}

export async function catalogStats(supplierCode?: string) {
  if (!hasDb()) {
    const rows = (mem().__lexiCatalog ?? []).filter(
      (r) => (!supplierCode || r.supplierCode === supplierCode) && r.sourceStatus !== "gone",
    );
    return {
      total: rows.length,
      imported: rows.filter((r) => r.importState === "imported").length,
      unknown: rows.filter((r) => stockAlertOf(r.stock, r.rawMeta) === "unknown").length,
      out: rows.filter((r) => stockAlertOf(r.stock, r.rawMeta) === "out").length,
      low: rows.filter((r) => stockAlertOf(r.stock, r.rawMeta) === "low").length,
    };
  }
  const active = supplierCode
    ? and(eq(catalogIndex.supplierCode, supplierCode), ne(catalogIndex.sourceStatus, "gone"))
    : ne(catalogIndex.sourceStatus, "gone");
  const [total] = await db()
    .select({ c: sql<number>`count(*)::int` })
    .from(catalogIndex)
    .where(active);
  const importedCond = supplierCode
    ? and(
        eq(catalogIndex.supplierCode, supplierCode),
        eq(catalogIndex.importState, "imported"),
        ne(catalogIndex.sourceStatus, "gone"),
      )
    : and(eq(catalogIndex.importState, "imported"), ne(catalogIndex.sourceStatus, "gone"));
  const [imported] = await db()
    .select({ c: sql<number>`count(*)::int` })
    .from(catalogIndex)
    .where(importedCond);
  const verified = sql`(${catalogIndex.rawMeta}->>'stockVerified') = 'true'`;
  const unknownCond = supplierCode
    ? and(
        eq(catalogIndex.supplierCode, supplierCode),
        ne(catalogIndex.sourceStatus, "gone"),
        sql`coalesce((${catalogIndex.rawMeta}->>'stockVerified')::boolean, false) = false`,
      )
    : and(
        ne(catalogIndex.sourceStatus, "gone"),
        sql`coalesce((${catalogIndex.rawMeta}->>'stockVerified')::boolean, false) = false`,
      );
  const [unknown] = await db().select({ c: sql<number>`count(*)::int` }).from(catalogIndex).where(unknownCond);
  const outCond = supplierCode
    ? and(
        eq(catalogIndex.supplierCode, supplierCode),
        ne(catalogIndex.sourceStatus, "gone"),
        verified,
        sql`${catalogIndex.stock} <= 0`,
      )
    : and(ne(catalogIndex.sourceStatus, "gone"), verified, sql`${catalogIndex.stock} <= 0`);
  const [out] = await db().select({ c: sql<number>`count(*)::int` }).from(catalogIndex).where(outCond);
  const lowCond = supplierCode
    ? and(
        eq(catalogIndex.supplierCode, supplierCode),
        ne(catalogIndex.sourceStatus, "gone"),
        verified,
        sql`${catalogIndex.stock} > 0 AND ${catalogIndex.stock} < ${STOCK_LOW_MAX}`,
      )
    : and(
        ne(catalogIndex.sourceStatus, "gone"),
        verified,
        sql`${catalogIndex.stock} > 0 AND ${catalogIndex.stock} < ${STOCK_LOW_MAX}`,
      );
  const [low] = await db().select({ c: sql<number>`count(*)::int` }).from(catalogIndex).where(lowCond);
  return {
    total: total?.c ?? 0,
    imported: imported?.c ?? 0,
    unknown: unknown?.c ?? 0,
    out: out?.c ?? 0,
    low: low?.c ?? 0,
  };
}

// silence unused import warnings in some drizzle versions
void asc;
void gt;
