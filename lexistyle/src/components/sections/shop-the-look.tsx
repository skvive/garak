"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { finalPrice, type Product } from "@/lib/dummy-data";
import { sample3CardImage } from "@/lib/pdp/sample3-helper";

type Pin = { x: number; y: number; product: Product };

/** Import 원장 상품 핀 — 더미 slug 금지 */
export function ShopTheLook({
  title = "Seoul City Look — 데일리 캐주얼",
  image,
  pins,
}: {
  title?: string;
  image: string;
  pins: Pin[];
}) {
  const [open, setOpen] = useState(false);
  if (!pins.length || !image) return null;

  return (
    <section aria-label="Shop the Look" className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="mb-1 text-[20px] font-bold md:text-[24px]">Shop the Look</h2>
      <p className="mb-4 text-[13px] text-dim">{title} — 핀을 눌러 착장 그대로 담기</p>

      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative aspect-[4/5] md:aspect-[16/9]">
          <Image src={image} alt={title} fill sizes="100vw" className="object-cover" />
        </div>
        {pins.map((pin) => (
          <button
            key={pin.product.slug}
            aria-label="이 착장의 상품 보기"
            onClick={() => setOpen(true)}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-lg transition-transform hover:scale-110"
          >
            <Plus className="size-4" strokeWidth={2.4} />
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-white/50" />
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="이 착장의 상품">
          <button aria-label="닫기" onClick={() => setOpen(false)} className="animate-fade-in absolute inset-0 bg-ink/50" />
          <div className="animate-sheet-up absolute inset-x-0 bottom-0 rounded-t-2xl bg-paper p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold">{title}</h3>
              <button aria-label="닫기" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-fog">
                <X className="size-5" />
              </button>
            </div>
            <ul className="divide-y divide-line">
              {pins.map(({ product: p }) => (
                <li key={p.slug}>
                  <Link href={`/product/${p.slug}`} className="flex items-center gap-3.5 py-3">
                    <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg bg-fog">
                      <Image src={sample3CardImage(p.image, p.slug)} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold text-dim">{p.brand}</span>
                      <span className="block truncate text-[14px]">{p.name}</span>
                    </span>
                    <span className="price text-[15px] font-bold">${finalPrice(p)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
