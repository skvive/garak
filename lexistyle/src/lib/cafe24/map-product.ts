// filepath: src/lib/cafe24/map-product.ts
import type { Product } from "@/lib/dummy-data";
import { cafe24KrwToUsd } from "./config";
import type { Cafe24Product } from "./types";

const CAT_MAP: Array<{ keys: string[]; cat: Product["category"] }> = [
  { keys: ["beauty", "스킨", "메이크", "화장품", "cosmetic", "health", "hair", "skincare"], cat: "beauty" },
  { keys: ["fashion", "의류", "패션", "옷", "apparel", "women", "dress", "blouse"], cat: "women-clothing" },
  { keys: ["men", "남성", "gentleman", "shirts", "수트"], cat: "men-clothing" },
  { keys: ["kids", "키즈", "유아동", "baby", "toy", "infant", "toddler"], cat: "kids" },
  { keys: ["life", "리빙", "홈", "생활", "푸드", "food", "home", "garden", "kitchen", "household"], cat: "home-garden" },
  { keys: ["가방", "신발", "bag", "shoe", "sneaker", "boot", "footwear", "accessory"], cat: "bags-shoes" },
  { keys: ["전자", "electronics", "gadget", "camera", "audio", "headphone"], cat: "electronics" },
  { keys: ["sport", "스포츠", "outdoor", "fitness", "yoga", "camping"], cat: "sports" },
];

function inferCategory(p: Cafe24Product): Product["category"] {
  const blob = [
    p.product_name,
    p.brand_name,
    ...(p.category ?? []).map((c) => c.category_name ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  for (const row of CAT_MAP) {
    if (row.keys.some((k) => blob.includes(k.toLowerCase()))) return row.cat;
  }
  return "beauty";
}

function slugFromCafe24(p: Cafe24Product) {
  const custom = p.custom_product_code?.trim();
  if (custom) return custom.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  const code = p.product_code?.trim();
  if (code) return code.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  return `c24-${p.product_no}`;
}

function parsePrice(v: string | number | null | undefined) {
  if (v == null || v === "") return 0;
  return Number(String(v).replace(/,/g, ""));
}

/** Cafe24 Front Product → LEXI Product 계약 */
export function mapCafe24Product(p: Cafe24Product): Product & { cafe24ProductNo: number } {
  const priceKrw = parsePrice(p.price);
  const retail = parsePrice(p.retail_price);
  const discount =
    retail > priceKrw && retail > 0
      ? Math.round(((retail - priceKrw) / retail) * 100)
      : 0;

  const image =
    p.detail_image ||
    p.list_image ||
    p.small_image ||
    p.tiny_image ||
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80";

  return {
    slug: slugFromCafe24(p),
    name: p.product_name,
    brand: p.brand_name || "LEXI",
    category: inferCategory(p),
    price: cafe24KrwToUsd(retail > 0 ? retail : priceKrw),
    discountRate: discount > 30 ? 30 : discount,
    rating: 4.6,
    reviewCount: 0,
    image,
    cafe24ProductNo: p.product_no,
    badge: discount >= 20 ? "DEAL" : undefined,
  };
}

export function parseSlugToProductNo(slug: string): number | null {
  const m = /^c24-(\d+)$/i.exec(slug);
  return m ? Number(m[1]) : null;
}
