// filepath: src/app/api/partner/orders/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { orderItems, orders, products as productsTable, users } from "@/db/schema";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { finalPrice, getProductBySlug } from "@/lib/catalog";
import { normalizeCustomsCode, validateCustomsCode } from "@/lib/customs";
import { createNotification } from "@/lib/notifications";
import { usdToKrw } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * 파트너 채널 주문 수신 (Linkr 등) — 서버-서버 전용.
 * 인증: Authorization: Bearer ${HQ_API_TOKEN}
 *
 * 파트너 측에서 이미 결제(포인트 차감 등)가 끝난 주문을 받으므로
 * status=paid 로 바로 생성한다. externalOrderId 가 멱등키:
 * 같은 키로 재요청하면 기존 주문을 그대로 돌려준다.
 */
type PartnerOrderInput = {
  channel?: string;
  externalOrderId: string;
  items: Array<{ slug: string; qty?: number }>;
  email?: string;
  name: string;
  phone?: string;
  address1: string;
  city?: string;
  postal?: string;
  country?: string;
  /** 개인통관고유부호 — 있으면 형식 검증 후 저장 */
  customsCode?: string;
};

export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();

  let body: PartnerOrderInput;
  try {
    body = (await req.json()) as PartnerOrderInput;
  } catch {
    return bad("invalid json");
  }

  const channel = (body.channel || "linkr").slice(0, 20);
  if (!body.externalOrderId) return bad("externalOrderId required");
  if (!body.name || !body.address1) return bad("name and address1 required");
  if (!Array.isArray(body.items) || body.items.length === 0) return bad("items required");

  const country = (body.country || "KR").slice(0, 2).toUpperCase();
  let customsCode: string | null = null;
  if (body.customsCode) {
    const err = validateCustomsCode(body.customsCode);
    if (err) return bad(err);
    customsCode = normalizeCustomsCode(body.customsCode);
  }

  // 상품 확인 + 금액 계산 (가격은 항상 서버 카탈로그 기준)
  const lines: Array<{ slug: string; qty: number; unitUsd: number; name: string }> = [];
  for (const item of body.items) {
    const qty = Math.max(1, Math.min(99, Math.floor(item.qty ?? 1)));
    const product = await getProductBySlug(item.slug);
    if (!product) return bad(`unknown product: ${item.slug}`);
    lines.push({ slug: item.slug, qty, unitUsd: finalPrice(product), name: product.name });
  }
  const totalUsd = +lines.reduce((s, l) => s + l.unitUsd * l.qty, 0).toFixed(2);
  const amountKrw = usdToKrw(totalUsd);
  const paymentOrderId = `${channel}_${body.externalOrderId}`;

  if (!hasDb()) {
    return NextResponse.json({
      ok: true,
      orderId: 0,
      paymentOrderId,
      status: "paid",
      totalUsd,
      amountKrw,
      mode: "memory" as const,
    });
  }

  const database = db();

  // 멱등: 동일 externalOrderId 재요청은 기존 주문 반환
  const [existing] = await database
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.paymentOrderId, paymentOrderId))
    .limit(1);
  if (existing) {
    return NextResponse.json({
      ok: true,
      orderId: existing.id,
      paymentOrderId,
      status: existing.status,
      totalUsd,
      amountKrw,
      duplicated: true,
      mode: "neon" as const,
    });
  }

  // 이메일이 오면 users 매칭/생성, 없으면 게스트 주문
  let userId: number | null = null;
  if (body.email) {
    const [found] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (found) userId = found.id;
    else {
      const inserted = await database
        .insert(users)
        .values({ email: body.email, name: body.name, country, isDummy: false })
        .returning({ id: users.id });
      userId = inserted[0]?.id ?? null;
    }
  }

  const [order] = await database
    .insert(orders)
    .values({
      userId,
      guestEmail: userId ? null : (body.email ?? null),
      country,
      status: "paid",
      totalUsd: String(totalUsd),
      amountKrw,
      dutyUsd: "0",
      shippingUsd: "0",
      shippingAddress: {
        name: body.name,
        address1: body.address1,
        city: body.city || "",
        postal: body.postal || "",
        country,
        phone: body.phone || null,
        customsCode,
        channel,
      },
      paymentProvider: channel,
      paymentOrderId,
      paymentRef: body.externalOrderId,
      isDummy: false,
    })
    .returning({ id: orders.id });

  for (const line of lines) {
    const [p] = await database
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, line.slug))
      .limit(1);
    if (!p) continue;
    await database.insert(orderItems).values({
      orderId: order.id,
      productId: p.id,
      qty: line.qty,
      unitPriceUsd: String(line.unitUsd),
      isDummy: false,
    });
  }

  if (body.email) {
    try {
      await createNotification(body.email, {
        type: "order",
        title: "주문이 접수되었습니다",
        body: `주문 #${order.id} · $${totalUsd} (${channel})`,
        href: "/account/orders",
      });
    } catch {
      /* non-blocking */
    }
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    paymentOrderId,
    status: "paid",
    totalUsd,
    amountKrw,
    mode: "neon" as const,
  });
}
