/** 선택 Import — 상세 조회 + 저용량 자산 + 자사 product 연결 */
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { brands, categories, importJobs, productImages, products } from "@/db/schema";
import { getConnector } from "@/lib/sourcing/registry";
import { fetchCjProductOptions } from "@/lib/sourcing/connectors/cjdropshipping";
import { optimizeAndStore, pickOptimizedUrls, listAssetsFor } from "./assets";
import { getCatalogById, patchCatalog, patchCatalogRawMeta, updateCatalogStock } from "./index-store";
import { CATEGORY_NAMES } from "./lexi-cj-categories";
import { DEPT_META, cjLeafBySlug, resolveCjCategory } from "./cj-taxonomy";
import { EXTRA_LEAVES, reclassifyLeaf } from "./reclassify-rules";
import { computeSellPrice } from "@/lib/hq/types";
import { localStore, scheduleLocalPersist, reviveDates } from "@/lib/local-store";
import { CJ_TOP_CATEGORIES, mapCjCategory } from "./cj-categories";
import { cjShortLabel } from "./category-taxonomy";
import type { CjCategory } from "@/lib/dummy-data";

type MemJob = {
  id: number;
  catalogId: number;
  supplierCode: string;
  externalId: string;
  status: string;
  productId: number | null;
  assetCount: number;
  error: string | null;
  payload: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

const g = globalThis as unknown as {
  __lexiImportJobs?: MemJob[];
  __lexiImportSeq?: number;
  __lexiImportHydrated?: boolean;
};
function mem() {
  if (!g.__lexiImportHydrated) {
    const s = localStore();
    g.__lexiImportJobs = ((s.importJobs ?? []) as MemJob[]).map((j) =>
      reviveDates(j as unknown as Record<string, unknown>, ["startedAt", "completedAt", "createdAt"]) as unknown as MemJob,
    );
    g.__lexiImportSeq = s.importSeq ?? 1;
    g.__lexiImportHydrated = true;
  }
  if (!g.__lexiImportJobs) g.__lexiImportJobs = [];
  if (!g.__lexiImportSeq) g.__lexiImportSeq = 1;
  return g;
}
function persistImports() {
  const s = localStore();
  s.importJobs = mem().__lexiImportJobs;
  s.importSeq = mem().__lexiImportSeq;
  scheduleLocalPersist();
}

function slugify(title: string, externalId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "item"}-${externalId}`.slice(0, 72);
}

/** CJ가 준 leaf 를 상품명 키워드 규칙으로 보정한 최종 하위 카테고리 정의 */
function resolveLeaf(categoryPath: string[] | null | undefined, title: string) {
  const resolved = resolveCjCategory(categoryPath);
  if (!resolved) return null;
  const to = reclassifyLeaf(title, resolved.slug);
  if (!to) return resolved;
  const extra = EXTRA_LEAVES.find((l) => l.slug === to);
  if (extra) return { ...resolved, slug: extra.slug, name: extra.name, dept: extra.dept as typeof resolved.dept };
  const known = cjLeafBySlug(to);
  if (known) return { slug: known.slug, name: known.ko, dept: known.dept, leaf: known.leaf };
  return resolved; // 알 수 없는 대상이면 CJ 원분류 유지
}

async function ensureBrandCategory(categoryPath: string[] | null | undefined, title: string) {
  if (!hasDb()) return { brandId: 1, categoryId: 1 };
  const d = db();
  // Brand는 하나
  let [brand] = await d.select().from(brands).where(eq(brands.slug, "lexi-sourced")).limit(1);
  if (!brand) {
    [brand] = await d
      .insert(brands)
      .values({ slug: "lexi-sourced", name: "LEXI Sourced", story: "Curated via LEXI sourcing pipeline" })
      .returning();
  }
  // 하위 = CJ leaf 카테고리, 상위 = 소속 부서. 부서/하위 행이 없으면 만들어 둔다.
  const resolved = resolveLeaf(categoryPath, title);
  if (resolved) {
    const deptMeta = DEPT_META.find((m) => m.slug === resolved.dept)!;
    let [dept] = await d.select().from(categories).where(eq(categories.slug, deptMeta.slug)).limit(1);
    if (!dept) {
      [dept] = await d
        .insert(categories)
        .values({ slug: deptMeta.slug, name: deptMeta.label, sort: deptMeta.sort })
        .returning();
    }
    let [leaf] = await d.select().from(categories).where(eq(categories.slug, resolved.slug)).limit(1);
    if (!leaf) {
      [leaf] = await d
        .insert(categories)
        .values({ slug: resolved.slug, name: resolved.name, sort: 500, parentId: dept.id })
        .returning();
    } else if (leaf.parentId !== dept.id || leaf.name !== resolved.name) {
      [leaf] = await d
        .update(categories)
        .set({ parentId: dept.id, name: resolved.name })
        .where(eq(categories.id, leaf.id))
        .returning();
    }
    return { brandId: brand.id, categoryId: leaf.id };
  }
  // CJ 카테고리를 알 수 없으면 기타 부서에 진열 (노출 누락 방지)
  const catSlug = "others";
  let [cat] = await d.select().from(categories).where(eq(categories.slug, catSlug)).limit(1);
  if (!cat) {
    [cat] = await d
      .insert(categories)
      .values({ slug: catSlug, name: CATEGORY_NAMES[catSlug] ?? catSlug, sort: 99 })
      .returning();
  }
  return { brandId: brand.id, categoryId: cat.id };
}

export async function runImportJob(catalogId: number) {
  const row = await getCatalogById(catalogId);
  if (!row) throw new Error("catalog item not found");

  const jobId = hasDb()
    ? (
        await db()
          .insert(importJobs)
          .values({
            catalogId,
            supplierCode: row.supplierCode,
            externalId: row.externalId,
            status: "running",
            startedAt: new Date(),
          })
          .returning({ id: importJobs.id })
      )[0].id
    : mem().__lexiImportSeq!++;

  if (!hasDb()) {
    mem().__lexiImportJobs!.push({
      id: jobId,
      catalogId,
      supplierCode: row.supplierCode,
      externalId: row.externalId,
      status: "running",
      productId: null,
      assetCount: 0,
      error: null,
      payload: null,
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
    });
    persistImports();
  }

  try {
    await patchCatalog(catalogId, { importState: "queued" });
    const connector = getConnector(row.supplierCode);
    if (!connector) throw new Error("connector missing");
    const detail = (await connector.getProduct(row.externalId)) ?? {
      externalId: row.externalId,
      title: row.title,
      categoryPath: row.categoryPath ?? [],
      price: Number(row.minPrice ?? 0),
      currency: row.currency,
      stock: row.stock,
      images: row.primaryThumbUrl ? [{ url: row.primaryThumbUrl }] : [],
      descriptionHtml: undefined,
      sellerName: row.sellerName ?? undefined,
    };

    const sourceImages = detail.images.slice(0, 6);
    let assetCount = 0;
    const optimized: string[] = [];
    for (const img of sourceImages) {
      try {
        const variants = await optimizeAndStore({
          catalogId,
          supplierCode: row.supplierCode,
          externalId: row.externalId,
          sourceUrl: img.url,
          variants: ["thumb", "card", "pdp"],
        });
        assetCount += variants.length;
        const pdp = variants.find((v) => v.variant === "pdp");
        if (pdp) optimized.push(pdp.url);
      } catch (e) {
        console.warn("[import asset]", img.url, e);
      }
    }

    // 자산이 실패하면 thumb URL은 저장하되, 공개 게시 전 단계에서는 최적본 우선
    if (!optimized.length && row.primaryThumbUrl) {
      optimized.push(row.primaryThumbUrl);
    }

    const { brandId, categoryId } = await ensureBrandCategory(
      detail.categoryPath ?? row.categoryPath,
      detail.title,
    );
    const slug = slugify(detail.title, detail.externalId);
    const factoryUsd = Number(detail.price);
    // 스토어 판매가 정책: (CJ 원가 + $20) × 1.3, x.9 — computeGlobalPrice(KR, 배송비 0)는 원가의 약 1.4배라 손실 판매가 됐다
    const sellUsd = computeSellPrice(factoryUsd);
    let productId: number | null = null;

    if (hasDb()) {
      const d = db();
      const [existing] = await d.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
      if (existing) {
        productId = existing.id;
        await d
          .update(products)
          .set({
            name: detail.title,
            description: detail.descriptionHtml ?? detail.title,
            priceUsd: String(sellUsd),
            stock: detail.stock >= 0 ? detail.stock : 0,
          brandId,
          categoryId,
          })
          .where(eq(products.id, productId));
      } else {
        const [p] = await d
          .insert(products)
          .values({
            slug,
            brandId,
            categoryId,
            name: detail.title,
            description: detail.descriptionHtml ?? detail.title,
            priceUsd: String(sellUsd),
            stock: detail.stock >= 0 ? detail.stock : 0,
            isDummy: false,
          })
          .returning({ id: products.id });
        productId = p.id;
      }
      // 기존 이미지 교체
      await d.delete(productImages).where(eq(productImages.productId, productId));
      let sort = 0;
      for (const url of optimized.slice(0, 8)) {
        await d.insert(productImages).values({ productId, url, sort: sort++, isDummy: false });
      }
      await d
        .update(importJobs)
        .set({
          status: "done",
          productId,
          assetCount,
          payload: { slug, optimizedCount: optimized.length, factoryUsd, sellUsd },
          completedAt: new Date(),
        })
        .where(eq(importJobs.id, jobId));
    } else {
      productId = jobId;
      const job = mem().__lexiImportJobs!.find((j) => j.id === jobId)!;
      Object.assign(job, {
        status: "done",
        productId,
        assetCount,
        payload: { slug, optimized, factoryUsd, sellUsd },
        completedAt: new Date(),
      });
      persistImports();
    }

    await patchCatalog(catalogId, { importState: "imported", productId });
    if (row.supplierCode === "cjdropshipping") {
      try {
        const cached = await fetchCjProductOptions(row.externalId);
        if (cached.rawVariants.length) {
          await patchCatalogRawMeta(catalogId, {
            variants: cached.rawVariants,
            warehouses: cached.warehouses,
            optionsCachedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn("[import options cache]", row.externalId, error);
      }
    }
    if (detail.stock >= 0) {
      await updateCatalogStock(catalogId, detail.stock, undefined, true);
    }
    const assets = await listAssetsFor(row.externalId, row.supplierCode);
    return {
      jobId,
      catalogId,
      productId,
      slug,
      assetCount,
      factoryUsd,
      sellUsd,
      optimizedUrls: pickOptimizedUrls(
        assets.map((a) => ({
          variant: a.variant,
          optimizedUrl: "optimizedUrl" in a ? a.optimizedUrl : (a as { optimizedUrl?: string }).optimizedUrl,
        })),
      ),
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await patchCatalog(catalogId, { importState: "failed" });
    if (hasDb()) {
      await db()
        .update(importJobs)
        .set({ status: "failed", error: err, completedAt: new Date() })
        .where(eq(importJobs.id, jobId));
    } else {
      const job = mem().__lexiImportJobs!.find((j) => j.id === jobId);
      if (job) Object.assign(job, { status: "failed", error: err, completedAt: new Date() });
      persistImports();
    }
    throw e;
  }
}

export async function runImportMany(catalogIds: number[]) {
  const results = [];
  for (const id of catalogIds) {
    try {
      results.push({ ok: true, ...(await runImportJob(id)) });
    } catch (e) {
      results.push({ ok: false, catalogId: id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
