import { hasDb } from "@/db";
import { rawQuery } from "@/db/sql";
import { listProducts, type Product } from "@/lib/catalog";
import { listDressable } from "./dressable";

/** Product references must be the actual SKU image, not a PDP marketing override. */
export async function lookCatalog() {
  let all: Product[];
  if (hasDb()) {
    const rows = await rawQuery(`SELECT p.slug,p.name,b.name AS brand,c.slug AS category,p.price_usd AS price,
      p.discount_rate AS discount,im.url AS image FROM products p
      JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
      JOIN LATERAL (SELECT url FROM product_images WHERE product_id=p.id AND deleted_at IS NULL ORDER BY sort,id LIMIT 1) im ON true
      WHERE p.deleted_at IS NULL AND b.deleted_at IS NULL AND p.is_dummy=false ORDER BY p.id DESC LIMIT 5000`);
    all = rows.map(r => ({ slug: String(r.slug), name: String(r.name), brand: String(r.brand), category: String(r.category), price: Number(r.price), discountRate: Number(r.discount), image: String(r.image), rating: 0, reviewCount: 0 }));
  } else all = await listProducts({ category: "fashion" });
  return listDressable(all).filter(item => item.image && !/picsum\.photos/.test(item.image));
}
