import Image from "next/image";
import Link from "next/link";
import { Timer } from "lucide-react";
import { useState, useEffect } from "react";
import { finalPrice, type Product } from "@/lib/catalog";
import { sample3CardImage } from "@/lib/pdp/sample3-helper";
import { TimeDealCountdown } from "@/components/sections/time-deal-countdown";

/** Import 원장 상품으로 타임딜 렌더 — 더미 슬러그 금지 */
export function TimeDeal({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section aria-label="타임딜" className="bg-coral py-9 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Timer className="size-6" strokeWidth={2} />
            <h2 className="text-[20px] font-bold md:text-[24px]">오늘 자정까지, 셀렉션 딜</h2>
          </div>
          <TimeDealCountdown />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/product/${p.slug}`}
              className="w-40 shrink-0 rounded-xl bg-white p-2.5 text-ink shadow-sm md:w-52"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-fog">
                <Image
                  src={sample3CardImage(p.image, p.slug)}
                  alt={p.name}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized={sample3CardImage(p.image, p.slug).startsWith("http")}
                />
              </div>
              <p className="mt-2 line-clamp-1 text-[13px]">{p.name}</p>
              <p className="price mt-0.5 text-[15px] font-bold">
                {p.discountRate > 0 && <span className="text-coral">{p.discountRate}% </span>}
                ${finalPrice(p)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
