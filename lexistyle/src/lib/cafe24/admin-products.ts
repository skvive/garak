// filepath: src/lib/cafe24/admin-products.ts
import { cafe24AdminConfigured, cafe24ShopNo } from "./config";
import { cafe24Fetch } from "./client";

export async function cafe24AdminListProducts(limit = 100) {
  if (!cafe24AdminConfigured()) return null;
  try {
    return await cafe24Fetch<{ products?: unknown[] }>({
      scope: "admin",
      path: "/products",
      query: { limit },
    });
  } catch (e) {
    console.error("[cafe24.admin.products]", e);
    return null;
  }
}

export async function cafe24AdminCreateProduct(input: {
  name: string;
  priceKrw: number;
  description?: string;
}) {
  if (!cafe24AdminConfigured()) throw new Error("Cafe24 Admin token required");
  return cafe24Fetch({
    scope: "admin",
    method: "POST",
    path: "/products",
    body: {
      shop_no: cafe24ShopNo(),
      request: {
        display: "T",
        selling: "T",
        product_name: input.name,
        price: String(input.priceKrw),
        supply_price: String(input.priceKrw),
        description: input.description ?? "",
      },
    },
  });
}
