// filepath: src/lib/reviews.ts
import { eq, desc } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { reviews, users, products as productsTable } from "@/db/schema";

export type ReviewRow = {
  id: number;
  rating: number;
  body: string | null;
  authorName: string | null;
  createdAt: Date;
};

async function getOrCreateUserId(email: string, name?: string | null): Promise<number> {
  const d = db();
  const existing = await d.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await d.insert(users).values({ email, name: name ?? null }).returning({ id: users.id });
  return row.id;
}

export async function listReviews(slug: string): Promise<ReviewRow[]> {
  if (!hasDb()) return [];
  try {
    const rows = await db()
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        createdAt: reviews.createdAt,
        authorName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(productsTable, eq(reviews.productId, productsTable.id))
      .where(eq(productsTable.slug, slug))
      .orderBy(desc(reviews.createdAt))
      .limit(20);
    return rows;
  } catch {
    return [];
  }
}

export async function createReview(
  email: string,
  name: string | null | undefined,
  slug: string,
  rating: number,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasDb()) return { ok: false, error: "DB 미연결" };
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));
  const trimmed = body.trim().slice(0, 1000);
  if (!trimmed) return { ok: false, error: "리뷰 내용을 입력해주세요" };
  try {
    const userId = await getOrCreateUserId(email, name);
    const [product] = await db()
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);
    const productId = product?.id ?? null;
    if (!productId) return { ok: false, error: "상품을 찾을 수 없습니다" };
    await db().insert(reviews).values({ productId, userId, rating: clampedRating, body: trimmed });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "저장 실패" };
  }
}
