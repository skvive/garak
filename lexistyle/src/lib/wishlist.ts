// filepath: src/lib/wishlist.ts
/** 위시리스트 — 로그인 사용자 전용. DB 미연결 시 항상 빈 목록(안내 문구는 UI에서 처리). */
import { eq, and, inArray } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { wishlists, users, products as productsTable } from "@/db/schema";
import { getProductBySlug, type Product } from "@/lib/catalog";

async function getOrCreateUserId(email: string, name?: string | null): Promise<number> {
  const d = db();
  const existing = await d.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await d.insert(users).values({ email, name: name ?? null }).returning({ id: users.id });
  return row.id;
}

async function productIdBySlug(slug: string): Promise<number | null> {
  const [row] = await db()
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

export async function listWishlistSlugs(email: string): Promise<string[]> {
  if (!hasDb()) return [];
  try {
    const userId = await getOrCreateUserId(email);
    const rows = await db()
      .select({ slug: productsTable.slug })
      .from(wishlists)
      .innerJoin(productsTable, eq(wishlists.productId, productsTable.id))
      .where(eq(wishlists.userId, userId));
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function listWishlistProducts(email: string): Promise<Product[]> {
  const slugs = await listWishlistSlugs(email);
  const out: Product[] = [];
  for (const s of slugs) {
    const p = await getProductBySlug(s);
    if (p) out.push(p);
  }
  return out;
}

/** 토글 후 현재 상태(true=담김) 반환. DB 미연결 시 no-op(false 반환). */
export async function toggleWishlist(
  email: string,
  name: string | null | undefined,
  slug: string,
): Promise<{ inWishlist: boolean; supported: boolean }> {
  if (!hasDb()) return { inWishlist: false, supported: false };
  try {
    const userId = await getOrCreateUserId(email, name);
    const productId = await productIdBySlug(slug);
    if (!productId) return { inWishlist: false, supported: true };

    const existing = await db()
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing[0]) {
      await db().delete(wishlists).where(eq(wishlists.id, existing[0].id));
      return { inWishlist: false, supported: true };
    }
    await db().insert(wishlists).values({ userId, productId });
    return { inWishlist: true, supported: true };
  } catch {
    return { inWishlist: false, supported: false };
  }
}

/** 여러 slug의 위시 여부를 한 번에 조회(카드 그리드용) */
export async function wishlistedSet(email: string | undefined, slugs: string[]): Promise<Set<string>> {
  if (!email || !hasDb() || slugs.length === 0) return new Set();
  try {
    const userId = await getOrCreateUserId(email);
    const rows = await db()
      .select({ slug: productsTable.slug })
      .from(wishlists)
      .innerJoin(productsTable, eq(wishlists.productId, productsTable.id))
      .where(and(eq(wishlists.userId, userId), inArray(productsTable.slug, slugs)));
    return new Set(rows.map((r) => r.slug));
  } catch {
    return new Set();
  }
}
