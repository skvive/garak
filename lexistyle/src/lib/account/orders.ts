import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { orderItems, orders, productImages, products, reviews, users } from "@/db/schema";
import { publicTrackPath, trackTokenOf } from "@/lib/hq/track-public";
import { safeShippingAddress, type SafeShippingAddress } from "./presentation";

export type AccountOrderItem = {
  id: number;
  productId: number;
  slug: string;
  title: string;
  image: string | null;
  option: string | null;
  quantity: number;
  unitPriceUsd: string;
};

export type AccountTracking = {
  carrier: string | null;
  trackingNumber: string;
  status: string;
  trackUrl?: string;
};

export type AccountOrder = {
  id: number;
  status: string;
  totalUsd: string;
  amountKrw: number | null;
  shippingUsd: string;
  dutyUsd: string;
  country: string | null;
  createdAt: Date;
  address: SafeShippingAddress | null;
  items: AccountOrderItem[];
  tracking: AccountTracking[];
};

export type AccountReview = {
  id: number;
  rating: number;
  body: string | null;
  createdAt: Date;
  slug: string;
  productName: string;
  productImage: string | null;
};

export type ReviewEligibleProduct = {
  productId: number;
  slug: string;
  productName: string;
  productImage: string | null;
};

const normalizedEmail = (email: string) => email.trim().toLowerCase();

async function accountUser(email: string) {
  const [row] = await db()
    .select({ id: users.id, email: users.email, tier: users.tier, points: users.points })
    .from(users)
    .where(and(
      sql`lower(${users.email}) = ${normalizedEmail(email)}`,
      eq(users.isDummy, false),
      isNull(users.deletedAt),
      eq(users.status, "active"),
    ))
    .limit(1);
  return row ?? null;
}

function ownerFilter(userId: number | null, email: string) {
  const guest = and(
    isNull(orders.userId),
    sql`lower(${orders.guestEmail}) = ${normalizedEmail(email)}`,
  );
  return userId ? or(eq(orders.userId, userId), guest)! : guest;
}

async function loadItems(orderIds: number[]) {
  const byOrder = new Map<number, AccountOrderItem[]>();
  if (!orderIds.length) return byOrder;

  const rows = await db()
    .select({
      orderId: orderItems.orderId,
      id: orderItems.id,
      productId: products.id,
      slug: products.slug,
      title: products.name,
      image: productImages.url,
      option: orderItems.variantLabel,
      quantity: orderItems.qty,
      unitPriceUsd: orderItems.unitPriceUsd,
    })
    .from(orderItems)
    .innerJoin(products, and(
      eq(orderItems.productId, products.id),
      eq(products.isDummy, false),
      isNull(products.deletedAt),
    ))
    .leftJoin(productImages, and(
      eq(productImages.productId, products.id),
      eq(productImages.sort, 0),
      eq(productImages.isDummy, false),
      isNull(productImages.deletedAt),
    ))
    .where(and(
      inArray(orderItems.orderId, orderIds),
      eq(orderItems.isDummy, false),
      isNull(orderItems.deletedAt),
    ))
    .orderBy(asc(orderItems.id));

  for (const row of rows) {
    const list = byOrder.get(row.orderId) ?? [];
    if (!list.some((item) => item.id === row.id)) list.push({
      id: row.id,
      productId: row.productId,
      slug: row.slug,
      title: row.title,
      image: row.image,
      option: row.option,
      quantity: row.quantity,
      unitPriceUsd: row.unitPriceUsd,
    });
    byOrder.set(row.orderId, list);
  }
  return byOrder;
}

async function loadExactTracking(orderId: number): Promise<AccountTracking[]> {
  try {
    const { getState } = await import("@/lib/hq/store");
    const state = await getState();
    const requests = state.purchaseRequests.filter((request) =>
      request.rawRow?.lexiOrderId === String(orderId)
      && request.externalOrderRef.startsWith(`LXO-${orderId}:`),
    );
    const requestIds = new Set(requests.map((request) => request.id));
    const seen = new Set<string>();
    return state.sourcingOrders.flatMap((order) => {
      if (!requestIds.has(order.purchaseRequestId) || !order.trackingNo) return [];
      const key = `${order.carrier ?? order.logisticName ?? ""}:${order.trackingNo}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        carrier: order.carrier ?? order.logisticName ?? null,
        trackingNumber: order.trackingNo,
        status: order.status,
        trackUrl: trackTokenOf(order) ? publicTrackPath(trackTokenOf(order)!) : undefined,
      }];
    });
  } catch {
    return [];
  }
}

export async function listAccountOrders(email: string): Promise<AccountOrder[]> {
  if (!hasDb()) return [];
  const user = await accountUser(email);
  const rows = await db()
    .select({
      id: orders.id,
      status: orders.status,
      totalUsd: orders.totalUsd,
      amountKrw: orders.amountKrw,
      shippingUsd: orders.shippingUsd,
      dutyUsd: orders.dutyUsd,
      country: orders.country,
      createdAt: orders.createdAt,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .where(and(
      ownerFilter(user?.id ?? null, email),
      eq(orders.isDummy, false),
      isNull(orders.deletedAt),
    ))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  const items = await loadItems(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    address: safeShippingAddress(row.shippingAddress),
    items: items.get(row.id) ?? [],
    tracking: [],
  }));
}

export async function getAccountOrder(email: string, orderId: number): Promise<AccountOrder | null> {
  if (!hasDb() || !Number.isSafeInteger(orderId) || orderId < 1) return null;
  const user = await accountUser(email);
  const [row] = await db()
    .select({
      id: orders.id,
      status: orders.status,
      totalUsd: orders.totalUsd,
      amountKrw: orders.amountKrw,
      shippingUsd: orders.shippingUsd,
      dutyUsd: orders.dutyUsd,
      country: orders.country,
      createdAt: orders.createdAt,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .where(and(
      eq(orders.id, orderId),
      ownerFilter(user?.id ?? null, email),
      eq(orders.isDummy, false),
      isNull(orders.deletedAt),
    ))
    .limit(1);
  if (!row) return null;
  const [items, tracking] = await Promise.all([loadItems([row.id]), loadExactTracking(row.id)]);
  return {
    ...row,
    address: safeShippingAddress(row.shippingAddress),
    items: items.get(row.id) ?? [],
    tracking,
  };
}

export async function getAccountRewards(email: string) {
  if (!hasDb()) return null;
  const user = await accountUser(email);
  return user ? { tier: user.tier, points: user.points } : null;
}

export async function getAccountReviews(email: string): Promise<{
  reviews: AccountReview[];
  eligible: ReviewEligibleProduct[];
}> {
  if (!hasDb()) return { reviews: [], eligible: [] };
  const user = await accountUser(email);
  if (!user) return { reviews: [], eligible: [] };

  const reviewRows = await db()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
      productId: products.id,
      slug: products.slug,
      productName: products.name,
      productImage: productImages.url,
    })
    .from(reviews)
    .innerJoin(products, and(
      eq(reviews.productId, products.id),
      eq(products.isDummy, false),
      isNull(products.deletedAt),
    ))
    .leftJoin(productImages, and(
      eq(productImages.productId, products.id),
      eq(productImages.sort, 0),
      eq(productImages.isDummy, false),
      isNull(productImages.deletedAt),
    ))
    .where(and(
      eq(reviews.userId, user.id),
      eq(reviews.isDummy, false),
      isNull(reviews.deletedAt),
    ))
    .orderBy(desc(reviews.createdAt));

  const uniqueReviews = [...new Map(reviewRows.map((row) => [row.id, row])).values()];
  const delivered = await db()
    .select({
      productId: products.id,
      slug: products.slug,
      productName: products.name,
      productImage: productImages.url,
    })
    .from(orderItems)
    .innerJoin(orders, and(
      eq(orderItems.orderId, orders.id),
      ownerFilter(user.id, email),
      eq(orders.status, "delivered"),
      eq(orders.isDummy, false),
      isNull(orders.deletedAt),
    ))
    .innerJoin(products, and(
      eq(orderItems.productId, products.id),
      eq(products.isDummy, false),
      isNull(products.deletedAt),
    ))
    .leftJoin(productImages, and(
      eq(productImages.productId, products.id),
      eq(productImages.sort, 0),
      eq(productImages.isDummy, false),
      isNull(productImages.deletedAt),
    ))
    .where(and(eq(orderItems.isDummy, false), isNull(orderItems.deletedAt)));

  const reviewed = new Set(uniqueReviews.map((row) => row.productId));
  const eligible = [...new Map(delivered
    .filter((row) => !reviewed.has(row.productId))
    .map((row) => [row.productId, row])).values()];
  return { reviews: uniqueReviews, eligible };
}
