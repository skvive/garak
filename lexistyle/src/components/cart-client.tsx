// filepath: src/components/cart-client.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DutyCalculator } from "@/components/duty-calculator";
import { products as dummyProducts } from "@/lib/dummy-data";
import { SectionHeader } from "@/components/ui/commerce";
import { ProductCardDense } from "@/components/commerce/product-card-dense";
import { sample3CardImage } from "@/lib/pdp/sample3-helper";

type Line = {
  slug: string;
  qty: number;
  lineTotal: number;
  product: { name: string; brand: string; image: string };
  variantSku?: string;
  variantLabel?: string;
};

const lineKey = (l: Line) => `${l.slug}::${l.variantSku ?? ""}`;

export function CartClient() {
  const [items, setItems] = useState<Line[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/cart");
    const data = await res.json();
    const lines: Line[] = data.items ?? [];
    setItems(lines);
    setSubtotal(data.subtotal ?? 0);
    setChecked(new Set(lines.map(lineKey)));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setQty(slug: string, qty: number, sku?: string) {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, qty, sku }),
    });
    const data = await res.json();
    setItems(data.items ?? []);
    setSubtotal(data.subtotal ?? 0);
  }

  const toFree = Math.max(0, 49 - subtotal);
  const allChecked = items.length > 0 && checked.size === items.length;
  const selectedItems = items.filter((l) => checked.has(lineKey(l)));
  const selectedTotal = +selectedItems.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);

  function toggleAll() {
    setChecked(allChecked ? new Set() : new Set(items.map(lineKey)));
  }
  function toggleOne(slug: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  if (loading) {
    return <p className="mt-8 text-[13px] text-dim">장바구니 불러오는 중…</p>;
  }

  if (!items.length) {
    return (
      <div className="mt-8 rounded-2xl bg-fog p-8 text-center">
        <p className="text-[15px] font-semibold">장바구니가 비어 있습니다</p>
        <Link href="/best" className="mt-4 inline-block text-[13px] font-bold text-coral">
          베스트로 쇼핑하기 →
        </Link>
      </div>
    );
  }

  const inCartSlugs = new Set(items.map((l) => l.slug));
  const crossSell = dummyProducts.filter((p) => !inCartSlugs.has(p.slug)).slice(0, 4);

  return (
    <>
      <div className="mt-4 rounded-xl bg-fog p-4">
        <p className="text-[13px] font-semibold">
          {toFree > 0 ? (
            <>
              <span className="price text-coral">${toFree.toFixed(2)}</span> 더 담으면 무료배송
            </>
          ) : (
            <span className="text-sage">무료배송 조건 달성 ✓</span>
          )}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-coral transition-all"
            style={{ width: `${Math.min(100, (subtotal / 49) * 100)}%` }}
          />
        </div>
      </div>

      {/* 전체선택 — §S-027 */}
      <label className="mt-5 flex items-center gap-2.5 border-b border-line pb-3 text-[13px] font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="size-4 accent-ink"
        />
        전체선택 ({checked.size}/{items.length})
      </label>

      <ul className="divide-y divide-line">
        {items.map((l) => (
          <li key={lineKey(l)} className="flex items-center gap-3.5 py-4">
            <input
              type="checkbox"
              checked={checked.has(l.slug)}
              onChange={() => toggleOne(l.slug)}
              className="size-4 shrink-0 accent-ink"
            />
            <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl bg-fog">
              <Image src={sample3CardImage(l.product.image, l.slug)} alt="" fill sizes="80px" className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-dim">{l.product.brand}</p>
              <p className="truncate text-[14px]">{l.product.name}</p>
              {l.variantLabel && <p className="mt-0.5 text-[13px] text-dim">옵션: {l.variantLabel}</p>}
              <p className="price mt-1 text-[15px] font-bold">${l.lineTotal.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="size-8 rounded-lg border border-line"
                onClick={() => setQty(l.slug, l.qty - 1, l.variantSku)}
              >
                −
              </button>
              <span className="price w-6 text-center text-[13px]">{l.qty}</span>
              <button
                type="button"
                className="size-8 rounded-lg border border-line"
                onClick={() => setQty(l.slug, l.qty + 1, l.variantSku)}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* 주문요약 카드 — §S-027 */}
      <div className="pdp-price-gradient mt-2 rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-soft">선택 상품 금액 ({selectedItems.length}개)</span>
          <span className="price font-bold">${selectedTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4">
        <DutyCalculator price={selectedTotal} />
      </div>

      {crossSell.length > 0 && (
        <div className="mt-8 -mx-4">
          <SectionHeader title="다시 담아보세요" sub="자주 찾는 셀렉션" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-4">
            {crossSell.map((p) => (
              <ProductCardDense key={p.slug} product={p} />
            ))}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur-md md:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <p className="price text-[18px] font-bold">${selectedTotal.toFixed(2)}</p>
          <Link
            href="/checkout"
            aria-disabled={selectedItems.length === 0}
            className={`pdp-cta-gradient flex-1 rounded-xl py-3.5 text-center text-[14px] font-bold text-white transition-opacity ${
              selectedItems.length === 0 ? "pointer-events-none opacity-40" : "hover:opacity-90"
            }`}
          >
            선택 {selectedItems.length}개 구매하기
          </Link>
        </div>
      </div>
    </>
  );
}
