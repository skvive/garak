import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { searchCatalog } from "@/lib/catalog/index-store";
import { mapCjCategory } from "@/lib/catalog/cj-categories";

export const dynamic = "force-dynamic";

/** GET — 카탈로그 기반 핫 추천 (컬렉션 catalogId와 동일 ID) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 24) || 24, 60);
  const category = url.searchParams.get("category") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const { items } = await searchCatalog({
    q,
    limit: 100,
    includeThumb: true,
    supplier: "cjdropshipping",
  });

  const scored = items
    .filter((p) => !category || mapCjCategory(p.categoryPath) === category)
    .map((p) => {
      const stockScore = Math.min((p.stock ?? 0) / 100, 1) * 30;
      const price = Number(p.minPrice ?? 0);
      const priceScore = price >= 5 && price <= 50 ? 40 : price >= 3 && price <= 100 ? 25 : 10;
      const recency = Date.now() - new Date(p.indexedAt ?? 0).getTime();
      const recencyScore = Math.max(0, 30 - recency / (1000 * 60 * 60 * 24 * 7));
      return {
        id: p.id,
        externalId: p.externalId,
        title: p.title,
        thumbUrl: p.primaryThumbUrl,
        price: p.minPrice,
        currency: p.currency,
        stock: p.stock,
        categoryPath: p.categoryPath ?? [],
        sellerName: p.sellerName,
        hotScore: Math.round(stockScore + priceScore + recencyScore),
      };
    })
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, limit);

  return NextResponse.json({ products: scored, total: items.length });
}
