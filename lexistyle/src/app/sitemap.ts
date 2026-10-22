// filepath: src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { siteUrl } from "@/lib/site-url";
import { getCategoryTree } from "@/lib/catalog/category-tree";

export const dynamic = "force-dynamic";

/** 기본 언어 — 미들웨어가 접두어 없는 주소를 이 언어로 리다이렉트하므로 사이트맵은 최종 주소를 직접 나열한다 */
const LNG = "ko";

/**
 * /sitemap.xml — 진열 중인 상품·하위 카테고리·브랜드 + 정적 페이지.
 * 루트 라우트여야 `/sitemap.xml` 이 [lng] 동적 라우트(HTML 페이지)에 가려지지 않는다.
 * 상품·브랜드는 DB 에서 필요한 컬럼만 읽는다(전체 상품 객체 로딩 금지).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `${siteUrl()}/${LNG}`;
  const now = new Date();

  const staticPaths: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1.0, freq: "daily" },
    { path: "/best", priority: 0.9, freq: "daily" },
    { path: "/category", priority: 0.8, freq: "weekly" },
    { path: "/brands", priority: 0.6, freq: "weekly" },
    { path: "/support", priority: 0.5, freq: "monthly" },
    { path: "/legal/privacy", priority: 0.3, freq: "yearly" },
    { path: "/legal/terms", priority: 0.3, freq: "yearly" },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((s) => ({
    url: `${base}${s.path}`,
    lastModified: now,
    changeFrequency: s.freq,
    priority: s.priority,
  }));

  // 부서·하위 카테고리 (상품이 있는 것만)
  const tree = await getCategoryTree();
  for (const dept of tree) {
    if (dept.total === 0) continue;
    entries.push({ url: `${base}/category/${dept.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
    for (const sub of dept.children) {
      entries.push({
        url: `${base}/category/${dept.slug}?leaf=${encodeURIComponent(sub.slug)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  if (!hasDb()) return entries;
  try {
    const products = await db().execute(sql`
      select p.slug from products p
      join brands b on b.id = p.brand_id
      where p.deleted_at is null and b.deleted_at is null and p.is_dummy = false
      order by p.id desc`);
    for (const r of products.rows as Array<{ slug: string }>) {
      entries.push({ url: `${base}/product/${r.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
    }
    const brandRows = await db().execute(sql`
      select distinct b.name from brands b
      join products p on p.brand_id = b.id
      where b.deleted_at is null and p.deleted_at is null and p.is_dummy = false`);
    for (const r of brandRows.rows as Array<{ name: string }>) {
      // 브랜드 페이지는 브랜드명(원문)으로 조회한다 — slug 변환 시 404
      entries.push({ url: `${base}/brands/${encodeURIComponent(r.name)}`, lastModified: now, changeFrequency: "weekly", priority: 0.5 });
    }
  } catch {
    /* DB 일시 장애 시 정적/카테고리 항목만 반환 */
  }
  return entries;
}
