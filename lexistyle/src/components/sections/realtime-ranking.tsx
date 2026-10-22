import Link from "next/link";
import { listHomeProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

/** 홈 진열 — 여성의류 PDP 40개 상품 랭킹 */
export async function RealtimeRanking() {
  const all = await listHomeProducts(40);
  const ranked = [...all]
    .sort((a, b) => b.reviewCount - a.reviewCount || a.price - b.price)
    .slice(0, 6);

  if (!ranked.length) return null;

  return (
    <section aria-label="LEXI 추천 셀렉션" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-bold md:text-[24px]">LEXI 추천 셀렉션</h2>
          <p className="mt-1 text-[13px] text-dim">에디터가 고른 이번 주 셀렉션</p>
        </div>
        <Link href="/best" className="text-[13px] font-semibold text-dim hover:text-ink">
          전체 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 lg:grid-cols-6">
        {ranked.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
