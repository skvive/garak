// filepath: src/lib/cart-store.ts
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { cartItems, products } from "@/db/schema";
import { getProductBySlug, finalPrice, type Product } from "@/lib/catalog";

export const CART_COOKIE = "lexi_cart_token";

export type CartLine = {
  slug: string;
  qty: number;
  product: Product;
  lineTotal: number;
  /** 공급처 옵션 SKU (CJ vid) */
  variantSku?: string;
  variantLabel?: string;
};
export type CartVariant = { sku: string; label: string };
type JsonItem = { slug: string; qty: number; sku?: string; label?: string };

function newToken() {
  return `c_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function getCartToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;
  return newToken();
}

export async function ensureCartToken(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value;
  if (!token) {
    token = newToken();
    jar.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return token;
}

async function toLine(slug: string, qty: number, sku?: string | null, label?: string | null): Promise<CartLine | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  return {
    slug,
    qty,
    product,
    lineTotal: +(finalPrice(product) * qty).toFixed(2),
    ...(sku ? { variantSku: sku, variantLabel: label ?? undefined } : {}),
  };
}

/** DB 우선, 실패 시 쿠키 JSON 폴백 `lexi_cart_json` */
export async function readCart(): Promise<CartLine[]> {
  const token = await getCartToken();
  if (hasDb()) {
    try {
      const rows = await db()
        .select({
          qty: cartItems.qty,
          slug: products.slug,
          sku: cartItems.variantSku,
          label: cartItems.variantLabel,
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.cartToken, token));

      const lines: CartLine[] = [];
      for (const r of rows) {
        const line = await toLine(r.slug, r.qty, r.sku, r.label);
        if (line) lines.push(line);
      }
      if (lines.length) return lines;
    } catch {
      /* fall through */
    }
  }

  const jar = await cookies();
  const raw = jar.get("lexi_cart_json")?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as { items: JsonItem[] };
    const lines: CartLine[] = [];
    for (const it of parsed.items ?? []) {
      const line = await toLine(it.slug, it.qty, it.sku, it.label);
      if (line) lines.push(line);
    }
    return lines;
  } catch {
    return [];
  }
}

async function writeJsonFallback(items: JsonItem[]) {
  const jar = await cookies();
  jar.set("lexi_cart_json", encodeURIComponent(JSON.stringify({ items })), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setCartItem(slug: string, qty: number, variant?: CartVariant) {
  const token = await ensureCartToken();
  const product = await getProductBySlug(slug);
  if (!product) throw new Error("product not found");

  // Cafe24 Front Cart 미러 (실패해도 로컬 카트 유지)
  try {
    const cafe24No = (product as { cafe24ProductNo?: number }).cafe24ProductNo;
    if (cafe24No && qty > 0) {
      const { cafe24AddToCart } = await import("@/lib/cafe24/carts");
      const { cafe24Mode } = await import("@/lib/cafe24/config");
      if (cafe24Mode() !== "off") {
        await cafe24AddToCart({ productNo: cafe24No, quantity: qty }).catch(() => undefined);
      }
    }
  } catch {
    /* local cart continues */
  }

  const sku = variant?.sku ?? null;
  if (hasDb()) {
    try {
      const [row] = await db()
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (row) {
        const match = and(
          eq(cartItems.cartToken, token),
          eq(cartItems.productId, row.id),
          sku ? eq(cartItems.variantSku, sku) : isNull(cartItems.variantSku),
        );
        if (qty <= 0) {
          await db().delete(cartItems).where(match);
        } else {
          const existing = await db().select({ id: cartItems.id }).from(cartItems).where(match).limit(1);
          if (existing[0]) {
            await db()
              .update(cartItems)
              .set({ qty, updatedAt: new Date() })
              .where(eq(cartItems.id, existing[0].id));
          } else {
            await db().insert(cartItems).values({
              cartToken: token,
              productId: row.id,
              qty,
              variantSku: sku,
              variantLabel: variant?.label ?? null,
            });
          }
        }
        return readCart();
      }
    } catch {
      /* json fallback */
    }
  }

  const current = await readCart();
  const key = (s: string, k?: string | null) => `${s}::${k ?? ""}`;
  const map = new Map<string, JsonItem>(
    current.map((l) => [key(l.slug, l.variantSku), { slug: l.slug, qty: l.qty, sku: l.variantSku, label: l.variantLabel }]),
  );
  if (qty <= 0) map.delete(key(slug, sku));
  else map.set(key(slug, sku), { slug, qty, sku: sku ?? undefined, label: variant?.label });
  await writeJsonFallback([...map.values()]);
  return readCart();
}

export async function clearCart() {
  const token = await getCartToken();
  if (hasDb()) {
    try {
      await db().delete(cartItems).where(eq(cartItems.cartToken, token));
    } catch {
      /* ignore */
    }
  }
  const jar = await cookies();
  jar.set("lexi_cart_json", encodeURIComponent(JSON.stringify({ items: [] })), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
