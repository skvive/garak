// filepath: src/app/api/admin/banners/route.ts
import { NextResponse } from "next/server";
import { desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { banners } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ items: [] });

  const items = await db()
    .select()
    .from(banners)
    .where(isNull(banners.deletedAt))
    .orderBy(desc(banners.createdAt));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });

  const body = (await req.json()) as {
    slot: string;
    imageUrl: string;
    headline?: string;
    href?: string;
  };
  const [row] = await db()
    .insert(banners)
    .values({
      slot: body.slot,
      imageUrl: body.imageUrl,
      headline: body.headline,
      href: body.href,
      isDummy: false,
    })
    .returning();
  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "banner",
    entity: "banner",
    entityId: String(row.id),
    action: "create",
    actor: admin.user.email ?? "admin",
    payload: { slot: body.slot, headline: body.headline ?? "", href: body.href ?? "" },
  });
  return NextResponse.json({ banner: row });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  const { id } = (await req.json()) as { id: number };
  await db().update(banners).set({ deletedAt: new Date() }).where(eq(banners.id, id));
  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "banner",
    entity: "banner",
    entityId: String(id),
    action: "delete",
    actor: admin.user.email ?? "admin",
    payload: { id },
  });
  return NextResponse.json({ ok: true });
}
