// filepath: src/lib/cafe24/catalog.ts
import { cafe24Mode } from "./config";
import { cafe24Fetch } from "./client";
import { mapCafe24Product, parseSlugToProductNo } from "./map-product";
import type { Cafe24Product, Cafe24ProductsResponse } from "./types";
import type { Product } from "@/lib/dummy-data";
import { productMatchesCategory } from "@/lib/catalog/category-taxonomy";

export type LexiCafe24Product = Product & { cafe24ProductNo: number };

async function fetchAllCafe24Products(): Promise<LexiCafe24Product[]> {
  const limit = 100;
  let offset = 0;
  const out: LexiCafe24Product[] = [];

  for (let page = 0; page < 20; page++) {
    const data = await cafe24Fetch<Cafe24ProductsResponse>({
      path: "/products",
      query: {
        limit,
        offset,
        display: "T",
        selling: "T",
      },
    });
    const list = data.products ?? [];
    for (const p of list) {
      if (p.display === "F" || p.selling === "F") continue;
      out.push(mapCafe24Product(p));
    }
    if (list.length < limit) break;
    offset += limit;
  }
  return out;
}

let cache: { at: number; items: LexiCafe24Product[] } | null = null;
const TTL_MS = 60_000;

export async function listCafe24Products(filter?: {
  category?: string;
  saleOnly?: boolean;
}): Promise<LexiCafe24Product[] | null> {
  if (cafe24Mode() === "off") return null;
  try {
    const now = Date.now();
    if (!cache || now - cache.at > TTL_MS) {
      cache = { at: now, items: await fetchAllCafe24Products() };
    }
    let list = cache.items;
    if (filter?.category) list = list.filter((p) => productMatchesCategory(p.category, filter.category!));
    if (filter?.saleOnly) list = list.filter((p) => p.discountRate > 0);
    return list;
  } catch (e) {
    console.error("[cafe24.catalog]", e);
    return null;
  }
}

export async function getCafe24ProductBySlug(
  slug: string,
): Promise<LexiCafe24Product | undefined> {
  if (cafe24Mode() === "off") return undefined;
  try {
    const all = await listCafe24Products();
    const hit = all?.find((p) => p.slug === slug);
    if (hit) return hit;

    const no = parseSlugToProductNo(slug);
    if (!no) return undefined;
    const data = await cafe24Fetch<Cafe24ProductsResponse>({
      path: `/products/${no}`,
    });
    const p = data.product as Cafe24Product | undefined;
    if (!p) return undefined;
    return mapCafe24Product(p);
  } catch (e) {
    console.error("[cafe24.getProduct]", e);
    return undefined;
  }
}

export async function searchCafe24Products(q: string): Promise<LexiCafe24Product[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const all = (await listCafe24Products()) ?? [];
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      p.brand.toLowerCase().includes(needle) ||
      p.slug.includes(needle),
  );
}
