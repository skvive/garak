// filepath: src/lib/checkout.ts
import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { dutyTable } from "@/lib/dummy-data";
import { clearCart, readCart } from "@/lib/cart-store";
import { finalPrice } from "@/lib/catalog";
import { requireSession } from "@/lib/auth/admin";
import {
  needsCustomsCode,
  normalizeCustomsCode,
  validateCustomsCode,
} from "@/lib/customs";
import { createNotification } from "@/lib/notifications";
import { appBaseUrl, usdToKrw } from "@/lib/payments/config";
import type { PaymentProvider } from "@/lib/payments/types";

export type CheckoutInput = {
  email: string;
  country: string;
  name: string;
  address1: string;
  city: string;
  postal: string;
  phone?: string;
  /** 개인통관고유부호 — 한국(KR) 배송 시 필수 */
  customsCode?: string;
};

export function newPaymentOrderId(provider: PaymentProvider) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `lexi_${provider}_${Date.now()}_${rand}`;
}

async function resolveUserId(input: CheckoutInput): Promise<{
  userId: number | null;
  session: Awaited<ReturnType<typeof requireSession>>;
}> {
  const database = db();
  const session = await requireSession();
  let userId: number | null = null;

  if (session?.user?.email) {
    const email = session.user.email;
    const existing = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) {
      userId = existing[0].id;
      if (session.user.id) {
        await database
          .update(users)
          .set({
            authUserId: session.user.id as string,
            name: session.user.name ?? input.name,
            image: session.user.image ?? null,
          })
          .where(eq(users.id, userId));
      }
    } else {
      const inserted = await database
        .insert(users)
        .values({
          email,
          authUserId: session.user.id as string,
          name: session.user.name ?? input.name,
          image: session.user.image ?? null,
          country: input.country.slice(0, 2),
          isDummy: false,
        })
        .returning({ id: users.id });
      userId = inserted[0]?.id ?? null;
    }
  } else if (input.email) {
    const existing = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing[0]) userId = existing[0].id;
    else {
      const inserted = await database
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          country: input.country.slice(0, 2),
          isDummy: false,
        })
        .returning({ id: users.id });
      userId = inserted[0]?.id ?? null;
    }
  }
  return { userId, session };
}

export async function quoteCart(country: string) {
  const lines = await readCart();
  if (!lines.length) throw new Error("cart is empty");
  const subtotal = +lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
  const dutyCfg = dutyTable[country] ?? dutyTable.SONGPANG;
  const duty = subtotal > dutyCfg.freeUnder ? +(subtotal * dutyCfg.rate).toFixed(2) : 0;
  const shipping = subtotal >= dutyCfg.freeUnder ? 0 : dutyCfg.shipping;
  const total = +(subtotal + duty + shipping).toFixed(2);
  const amountKrw = usdToKrw(total);
  const orderName =
    lines.length === 1
      ? lines[0].product.name
      : `${lines[0].product.name} 외 ${lines.length - 1}건`;
  return { lines, subtotal, duty, shipping, total, amountKrw, orderName };
}

/** pending_payment 주문 생성 (PG 승인 전) */
export async function createPendingOrder(
  input: CheckoutInput,
  provider: PaymentProvider,
) {
  if (needsCustomsCode(input.country)) {
    const err = validateCustomsCode(input.customsCode);
    if (err) throw new Error(err);
  }

  const quote = await quoteCart(input.country);
  const paymentOrderId = newPaymentOrderId(provider);

  if (!hasDb()) {
    return {
      orderId: 0,
      paymentOrderId,
      total: quote.total,
      amountKrw: quote.amountKrw,
      duty: quote.duty,
      shipping: quote.shipping,
      orderName: quote.orderName,
      mode: "memory" as const,
    };
  }

  const { userId, session } = await resolveUserId(input);
  const database = db();

  const [order] = await database
    .insert(orders)
    .values({
      userId,
      guestEmail: session?.user?.email ? null : input.email,
      country: input.country.slice(0, 2),
      status: "pending_payment",
      totalUsd: String(quote.total),
      amountKrw: quote.amountKrw,
      dutyUsd: String(quote.duty),
      shippingUsd: String(quote.shipping),
      shippingAddress: {
        name: input.name,
        address1: input.address1,
        city: input.city,
        postal: input.postal,
        country: input.country,
        phone: input.phone || null,
        customsCode: needsCustomsCode(input.country)
          ? normalizeCustomsCode(input.customsCode || "")
          : null,
      },
      paymentProvider: provider,
      paymentOrderId,
      isDummy: false,
    })
    .returning({ id: orders.id });

  for (const line of quote.lines) {
    const [p] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, line.slug))
      .limit(1);
    if (!p) continue;
    await database.insert(orderItems).values({
      orderId: order.id,
      productId: p.id,
      qty: line.qty,
      unitPriceUsd: String(finalPrice(line.product)),
      variantSku: line.variantSku ?? null,
      variantLabel: line.variantLabel ?? null,
      isDummy: false,
    });
  }

  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "order",
    entity: "order",
    entityId: String(order.id),
    action: "create",
    actor: input.email,
    payload: { id: order.id, total: quote.total, provider, status: "pending_payment" },
  });

  return {
    orderId: order.id,
    paymentOrderId,
    total: quote.total,
    amountKrw: quote.amountKrw,
    duty: quote.duty,
    shipping: quote.shipping,
    orderName: quote.orderName,
    mode: "neon" as const,
  };
}

export async function markOrderPaid(opts: {
  paymentOrderId?: string;
  orderId?: number;
  paymentRef: string;
  provider: PaymentProvider;
}) {
  if (!hasDb()) {
    await clearCart();
    return { ok: true as const, orderId: opts.orderId ?? 0 };
  }

  const database = db();
  const where = opts.paymentOrderId
    ? eq(orders.paymentOrderId, opts.paymentOrderId)
    : opts.orderId
      ? eq(orders.id, opts.orderId)
      : null;
  if (!where) throw new Error("order lookup key required");

  const [row] = await database.select().from(orders).where(where).limit(1);
  if (!row) throw new Error("order not found");
  if (row.status === "paid") {
    await clearCart();
    return { ok: true as const, orderId: row.id, alreadyPaid: true };
  }

  await database
    .update(orders)
    .set({
      status: "paid",
      paymentRef: opts.paymentRef,
      paymentProvider: opts.provider,
    })
    .where(and(eq(orders.id, row.id)));

  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "order",
    entity: "order",
    entityId: String(row.id),
    action: "paid",
    actor: "payment",
    payload: { id: row.id, provider: opts.provider, status: "paid" },
  });

  // Cafe24 hybrid: Admin API로 주문 미러 (실패해도 LEXI paid는 유지)
  try {
    const { cafe24CreateOrderMirror } = await import("@/lib/cafe24/orders");
    const { parseSlugToProductNo } = await import("@/lib/cafe24/map-product");
    const { getProductBySlug } = await import("@/lib/catalog");
    const lines = await database
      .select({
        productId: orderItems.productId,
        qty: orderItems.qty,
        unit: orderItems.unitPriceUsd,
        slug: products.slug,
        cafe24ProductNo: products.cafe24ProductNo,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, row.id));

    const mirrorItems: Array<{ productNo: number; quantity: number; priceKrw: number }> = [];
    for (const line of lines) {
      let no = line.cafe24ProductNo ?? parseSlugToProductNo(line.slug);
      if (!no) {
        const p = await getProductBySlug(line.slug);
        no = (p as { cafe24ProductNo?: number } | undefined)?.cafe24ProductNo ?? null;
      }
      if (!no) continue;
      const usd = Number(line.unit);
      const rate = Number(process.env.USD_KRW_RATE || 1350);
      mirrorItems.push({
        productNo: no,
        quantity: line.qty,
        priceKrw: Math.round(usd * rate),
      });
    }

    if (mirrorItems.length) {
      const addr = row.shippingAddress as { name?: string } | null;
      await cafe24CreateOrderMirror({
        orderId: row.paymentOrderId || `lexi_${row.id}`,
        buyerEmail: row.guestEmail || "order@lexi.shop",
        buyerName: addr?.name || "LEXI Customer",
        items: mirrorItems,
        country: row.country ?? undefined,
      });
    }
  } catch (e) {
    console.error("[cafe24 mirror]", e);
  }

  // 알림센터: 결제 완료 이벤트
  try {
    let notifyEmail = row.guestEmail;
    if (!notifyEmail && row.userId) {
      const [u] = await database
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, row.userId))
        .limit(1);
      notifyEmail = u?.email ?? null;
    }
    if (notifyEmail) {
      await createNotification(notifyEmail, {
        type: "order",
        title: "결제가 완료되었습니다",
        body: `주문 #${row.id} · $${row.totalUsd}`,
        href: "/account/orders",
      });
    }
  } catch {
    /* non-blocking */
  }

  // HQ 구매요청 → CJ 발주(미결제 단계). 옵션 SKU(CJ vid) 그대로 전달. 실패해도 결제 완료는 유지
  try {
    const { intakeLexiStoreOrder } = await import("@/lib/hq/services");
    const r = await intakeLexiStoreOrder(row.id);
    if (r.errors.length) console.error("[lexi→cj]", row.id, r.errors);
  } catch (e) {
    console.error("[lexi→cj]", e);
  }

  await clearCart();
  return { ok: true as const, orderId: row.id };
}

export async function findOrderByPaymentOrderId(paymentOrderId: string) {
  if (!hasDb()) return null;
  const [row] = await db()
    .select()
    .from(orders)
    .where(eq(orders.paymentOrderId, paymentOrderId))
    .limit(1);
  return row ?? null;
}

export async function findOrderById(orderId: number) {
  if (!hasDb()) return null;
  const [row] = await db().select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return row ?? null;
}

/** 하위 호환: 즉시 mock 결제 */
export async function placeOrder(input: CheckoutInput) {
  const pending = await createPendingOrder(input, "mock");
  const paymentRef = `mock_${pending.paymentOrderId}`;
  await markOrderPaid({
    paymentOrderId: pending.paymentOrderId,
    orderId: pending.orderId,
    paymentRef,
    provider: "mock",
  });
  return {
    orderId: pending.orderId,
    paymentRef,
    total: pending.total,
    duty: pending.duty,
    shipping: pending.shipping,
    mode: pending.mode,
    redirectUrl: `${appBaseUrl()}/checkout/success?provider=mock&ref=${encodeURIComponent(paymentRef)}&total=${pending.total}`,
  };
}
