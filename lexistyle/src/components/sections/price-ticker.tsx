import Link from "next/link";
import { finalPrice, productMeta, products } from "@/lib/dummy-data";

/**
 * 오늘의 시세 티커 — 히어로 직하단 무한 스크롤 마퀴.
 * 인어교주해적단식 시세 투명성을 홈 1-depth에 배치 (디자인 기획서 §2-1).
 */
export function PriceTicker() {
  const items = [...products]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 10)
    .map((p) => ({
      slug: p.slug,
      name: p.name.split("(")[0].trim(),
      price: finalPrice(p),
      down: p.discountRate > 0,
      grade: productMeta[p.slug]?.fatGrade ?? "",
    }));
  const row = (keyPrefix: string) =>
    items.map((it, i) => (
      <Link
        key={`${keyPrefix}-${i}`}
        href={`/product/${it.slug}`}
        className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-white/95 transition-opacity hover:opacity-80"
      >
        <span aria-hidden>🦐</span>
        <span className="font-bold">{it.name}</span>
        <span className="price font-bold tabular-nums">
          {it.price.toLocaleString("ko-KR")}원
        </span>
        {it.down && <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] font-bold">▼ 시세급락</span>}
        {it.grade && (
          <span className="rounded bg-[#2e7d5b]/90 px-1 py-0.5 text-[10px] font-bold">{it.grade}</span>
        )}
        <span className="ml-2 text-white/40">·</span>
      </Link>
    ));

  return (
    <section
      aria-label="오늘 가락시장 시세"
      className="ocean-band overflow-hidden border-b border-white/10"
    >
      <div className="mx-auto flex max-w-6xl items-center">
        <span className="z-10 flex shrink-0 items-center gap-1.5 bg-[#0a4468] px-3 py-2 text-[12px] font-bold text-white">
          ⚡ 오늘의 시세
        </span>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="animate-ticker flex w-max gap-6 whitespace-nowrap">
            {row("a")}
            {row("b")}
          </div>
        </div>
      </div>
    </section>
  );
}
