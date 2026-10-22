// filepath: src/app/api/partner/products/route.ts
import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { finalPrice, listProducts } from "@/lib/catalog";
import { usdToKrw } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * 파트너 채널 상품 피드 (Linkr 등) — 서버-서버 전용.
 * 인증: Authorization: Bearer ${HQ_API_TOKEN} (HQ API와 동일 토큰)
 * 가격은 판매가(할인 반영) USD + KRW 환산(USD_KRW_RATE)을 함께 내려준다.
 */
export async function GET(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();

  const list = await listProducts();
  return NextResponse.json(
    {
      source: "lexistyle",
      count: list.length,
      products: list.map((p) => {
        const priceUsd = finalPrice(p);
        return {
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          category: p.category,
          priceUsd,
          priceKrw: usdToKrw(priceUsd),
          discountRate: p.discountRate,
          rating: p.rating,
          reviewCount: p.reviewCount,
          image: p.image,
        };
      }),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
