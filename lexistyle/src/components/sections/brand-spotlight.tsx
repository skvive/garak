import Image from "next/image";
import Link from "next/link";
import { listHomeProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

/** 여성의류 PDP 40개 중 LEXI Sourced 브랜드 스포트라이트 */
export async function BrandSpotlight() {
  const all = await listHomeProducts(40);
  if (!all.length) return null;

  const sourced = all.filter((p) => p.brand === "LEXI Sourced");
  const pool = sourced.length ? sourced : all;
  const brandName = pool[0]?.brand ?? "LEXI Sourced";
  const items = pool.slice(0, 4);
  const heroImage = items[0]?.image;

  return (
    <section aria-label="브랜드 스포트라이트" className="bg-fog py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-[11px] font-bold tracking-[0.2em] text-dim">BRAND OF THE WEEK</p>
        <div className="mt-3 grid gap-6 md:grid-cols-[1.2fr_2fr] md:items-start">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-[3/4]">
            {heroImage && (
              <Image
                src={heroImage}
                alt={brandName}
                fill
                sizes="(max-width:768px) 100vw, 40vw"
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white">
              <h2 className="font-display text-[28px] font-semibold">{brandName}</h2>
              <p className="text-[13px] text-white/85">LEXI가 직접 고른 큐레이션</p>
            </div>
          </div>
          <div>
            <p className="mb-4 max-w-xl text-[14px] leading-relaxed text-dim">
              LEXI 에디터가 고른 셀렉션을 만나보세요.{" "}
              <Link href="/best" className="font-semibold text-ink underline underline-offset-4">
                전체 보기
              </Link>
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
