// filepath: src/app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { orders, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ items: [], source: "dummy" });

  const rows = await db()
    .select({
      id: orders.id,
      status: orders.status,
      totalUsd: orders.totalUsd,
      dutyUsd: orders.dutyUsd,
      shippingUsd: orders.shippingUsd,
      country: orders.country,
      guestEmail: orders.guestEmail,
      paymentRef: orders.paymentRef,
      createdAt: orders.createdAt,
      userEmail: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(isNull(orders.deletedAt))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return NextResponse.json({ items: rows, source: "neon" });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });

  const body = (await req.json()) as { id: number; status: string };
  const allowed = ["paid", "preparing", "shipped", "customs", "delivered", "cancelled"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  await db().update(orders).set({ status: body.status }).where(eq(orders.id, body.id));
  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "order",
    entity: "order",
    entityId: String(body.id),
    action: "status",
    actor: admin.user.email ?? "admin",
    payload: { id: body.id, status: body.status },
  });
  return NextResponse.json({ ok: true });
}
