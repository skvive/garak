// filepath: src/app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { brands, categories, productImages, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";
import { listProducts } from "@/lib/catalog";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!hasDb()) {
    const items = await listProducts();
    return NextResponse.json({ items, source: "dummy" });
  }

  const rows = await db()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceUsd: products.priceUsd,
      discountRate: products.discountRate,
      stock: products.stock,
      brand: brands.name,
      category: categories.slug,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(isNull(products.deletedAt))
    .orderBy(desc(products.createdAt))
    .limit(200);

  return NextResponse.json({ items: rows, source: "neon" });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });

  const body = (await req.json()) as {
    slug: string;
    name: string;
    brand: string;
    category: string;
    priceUsd: number;
    discountRate?: number;
    stock?: number;
    imageUrl?: string;
    description?: string;
  };

  const database = db();
  let [brand] = await database.select().from(brands).where(eq(brands.name, body.brand)).limit(1);
  if (!brand) {
    [brand] = await database
      .insert(brands)
      .values({
        slug: body.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: body.brand,
        isDummy: false,
      })
      .returning();
  }
  const [cat] = await database
    .select()
    .from(categories)
    .where(eq(categories.slug, body.category))
    .limit(1);
  if (!cat) return NextResponse.json({ error: "unknown category" }, { status: 400 });

  const [row] = await database
    .insert(products)
    .values({
      slug: body.slug,
      name: body.name,
      brandId: brand.id,
      categoryId: cat.id,
      priceUsd: String(body.priceUsd),
      discountRate: body.discountRate ?? 0,
      stock: body.stock ?? 0,
      description: body.description,
      isDummy: false,
    })
    .returning();

  if (body.imageUrl) {
    await database.insert(productImages).values({
      productId: row.id,
      url: body.imageUrl,
      sort: 0,
      isDummy: false,
    });
  }

  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "product",
    entity: "product",
    entityId: String(row.id),
    action: "create",
    actor: admin.user.email ?? "admin",
    payload: { slug: body.slug, name: body.name, priceUsd: body.priceUsd, stock: body.stock ?? 0 },
  });

  return NextResponse.json({ product: row });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });

  const body = (await req.json()) as {
    id?: number;
    slug?: string;
    stock?: number;
    priceUsd?: number;
    discountRate?: number;
    name?: string;
    softDelete?: boolean;
  };

  const target = body.id
    ? eq(products.id, body.id)
    : body.slug?.trim()
      ? eq(products.slug, body.slug.trim())
      : null;
  if (!target) return NextResponse.json({ error: "id or slug is required" }, { status: 400 });

  if (body.softDelete) {
    await db()
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(target, isNull(products.deletedAt)));
    const { sealLedger } = await import("@/lib/hq/integrity");
    void sealLedger({
      stream: "product",
      entity: "product",
      entityId: String(body.id ?? body.slug),
      action: "delete",
      actor: admin.user.email ?? "admin",
      payload: { id: body.id, slug: body.slug, softDelete: true },
    });
    return NextResponse.json({ ok: true });
  }

  await db()
    .update(products)
    .set({
      ...(body.stock !== undefined ? { stock: body.stock } : {}),
      ...(body.priceUsd !== undefined ? { priceUsd: String(body.priceUsd) } : {}),
      ...(body.discountRate !== undefined ? { discountRate: body.discountRate } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
    })
    .where(and(target, isNull(products.deletedAt)));

  const { sealLedger } = await import("@/lib/hq/integrity");
  void sealLedger({
    stream: "product",
    entity: "product",
    entityId: String(body.id ?? body.slug),
    action: "update",
    actor: admin.user.email ?? "admin",
    payload: { id: body.id, slug: body.slug, stock: body.stock, priceUsd: body.priceUsd, name: body.name },
  });

  return NextResponse.json({ ok: true });
}
