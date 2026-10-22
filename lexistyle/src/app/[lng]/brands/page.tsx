import { and, eq, isNull, ne } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { brands, categories, productImages, products } from "@/db/schema";
import { ProductCardDense } from "@/components/commerce/product-card-dense";
import { listProducts } from "@/lib/catalog";
import type { Product } from "@/lib/dummy-data";

export const metadata = { title: "Brands" };
export const dynamic = "force-dynamic";

/** 제네릭·플레이스홀더 브랜드 제외 — LEXI 소싱 실브랜드만 */
const GENERIC_BRANDS = new Set([
  "lexi sourced",
  "lexi sourcing",
  "lexi",
  "cj",
  "cjdropshipping",
  "cj dropshipping",
  "unknown",
  "untitled",
]);

function isNamedBrand(name: string) {
  const n = name.trim().toLowerCase();
  if (!n || n.length < 2) return false;
  if (GENERIC_BRANDS.has(n)) return false;
  if (/^cj[\s_-]?/i.test(n) && n.length < 6) return false;
  return true;
}

async function brandsFromDb(): Promise<{ name: string; slug: string; count: number; products: Product[] }[]> {
  if (!hasDb()) return [];
  try {
    const d = db();
    const rows = await d
      .select({
        brandId: brands.id,
        brandSlug: brands.slug,
        brandName: brands.name,
        productSlug: products.slug,
        productName: products.name,
        category: categories.slug,
        price: products.priceUsd,
        discountRate: products.discountRate,
        rating: products.ratingAvg,
        reviewCount: products.reviewCount,
        image: productImages.url,
      })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.sort, 0)),
      )
      .where(
        and(
          isNull(products.deletedAt),
          isNull(brands.deletedAt),
          eq(products.isDummy, false),
          ne(brands.slug, "lexi-sourced"),
        ),
      )
      .limit(800);

    const byBrand = new Map<string, { name: string; slug: string; products: Product[] }>();
    for (const r of rows) {
      if (!isNamedBrand(r.brandName)) continue;
      const key = r.brandSlug;
      let entry = byBrand.get(key);
      if (!entry) {
        entry = { name: r.brandName, slug: r.brandSlug, products: [] };
        byBrand.set(key, entry);
      }
      if (entry.products.length >= 8) continue;
      entry.products.push({
        slug: r.productSlug,
        name: r.productName,
        brand: r.brandName,
        category: r.category,
        price: Number(r.price ?? 0),
        discountRate: Number(r.discountRate ?? 0),
        rating: Number(r.rating ?? 4),
        reviewCount: Number(r.reviewCount ?? 0),
        image:
          r.image ||
          "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
      });
    }

    return [...byBrand.values()]
      .map((b) => ({ ...b, count: b.products.length }))
      .filter((b) => b.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
  } catch {
    return [];
  }
}

export default async function BrandsPage() {
  const brandRows = await brandsFromDb();
  const fallback =
    brandRows.length === 0
      ? (await listProducts()).filter((p) => isNamedBrand(p.brand))
      : [];

  const brandGroups =
    brandRows.length > 0
      ? brandRows
      : (() => {
          const map = new Map<string, Product[]>();
          for (const p of fallback) {
            const list = map.get(p.brand) ?? [];
            if (list.length < 8) list.push(p);
            map.set(p.brand, list);
          }
          return [...map.entries()]
            .map(([name, products]) => ({
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              count: products.length,
              products,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "en"));
        })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-12">
      <h1 className="font-display text-[30px] font-semibold">Brands A–Z</h1>
      <p className="mt-1 text-[13px] text-dim">
        LEXI 소싱 브랜드 상품 · {brandGroups.length.toLocaleString()}개 브랜드
      </p>

      {brandGroups.length === 0 ? (
        <p className="mt-16 text-center text-dim">브랜드 상품이 곧 공개됩니다.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {brandGroups.map((b) => (
            <section key={b.slug} id={b.slug}>
              <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
                <h2 className="text-[16px] font-bold text-ink">{b.name}</h2>
                <span className="text-[12px] text-dim">{b.count}개</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
                {b.products.map((p, i) => (
                  <ProductCardDense key={p.slug} product={p} extras={{ delivery: "standard" }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
