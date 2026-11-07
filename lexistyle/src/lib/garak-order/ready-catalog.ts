/**
 * Read-only GARAK partner catalog adapter.
 * The existing Neon garak_partner_products table and release_ready view are
 * authoritative. Do NOT share the generic LEXI USD product/order model.
 *
 * No mutation, demo fallback, payment acceptance, or private seller evidence.
 */
import { neon } from "@neondatabase/serverless";
import { hasDb } from "@/db";

export type ReadyGarakProduct = {
  sku: string;
  merchant_slug: string;
  name: string;
  description: string | null;
  price_krw: number;
  currency: "KRW";
  stock: number;
  category_code: string;
  image_ref: string | null;
  checkout_enabled: false;
};

const ALLOWED_SKU = /^GYS-[0-9]{3}$/;

export async function readyGarakProducts(skus?: readonly string[]): Promise<ReadyGarakProduct[]> {
  if (!hasDb() || !process.env.DATABASE_URL) throw new Error("Garak catalog DB not configured");
  if (skus && (skus.length > 20 || skus.some(x => !ALLOWED_SKU.test(x)))) {
    throw new Error("Invalid SKU request");
  }
  const filterJson = JSON.stringify(skus ?? []);
  const query = neon(process.env.DATABASE_URL);
  // JSONB array parameter avoids unsafe SQL string interpolation while
  // permitting one database call for both listings and checkout estimates.
  const rows = await query`
    SELECT p.sku, p.merchant_slug, p.name, p.description,
           p.price_krw, p.currency, p.stock, p.category_code, p.image_ref
    FROM public.garak_partner_products p
    INNER JOIN public.garak_partner_release_ready r ON r.sku = p.sku
    WHERE r.release_ready IS TRUE
      AND p.status = 'approved'
      AND p.visible IS TRUE
      AND p.purchasable IS TRUE
      AND p.image_verified IS TRUE
      AND p.stock > 0
      AND ( ${filterJson}::jsonb = '[]'::jsonb
            OR p.sku IN (
              SELECT jsonb_array_elements_text(${filterJson}::jsonb)
            )
          )
    ORDER BY p.source_no
    LIMIT 200
  `;
  return rows.filter(row =>
    typeof row.sku === "string" && ALLOWED_SKU.test(row.sku) &&
    Number.isInteger(row.price_krw) && row.price_krw > 0 &&
    Number.isInteger(row.stock) && row.stock > 0 &&
    row.currency === "KRW"
  ).map(row => ({
    sku: row.sku as string,
    merchant_slug: String(row.merchant_slug ?? "").slice(0, 100),
    name: String(row.name ?? "").slice(0, 150),
    description: row.description == null ? null : String(row.description).slice(0, 2000),
    price_krw: row.price_krw as number,
    currency: "KRW" as const,
    stock: row.stock as number,
    category_code: String(row.category_code ?? "").slice(0, 100),
    image_ref: row.image_ref == null ? null : String(row.image_ref).slice(0, 500),
    checkout_enabled: false as const,
  }));
}
