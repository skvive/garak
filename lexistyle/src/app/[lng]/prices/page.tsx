import Link from "next/link";
import { products, productMeta, type Product } from "@/lib/dummy-data";
import { departmentBySlug } from "@/lib/departments";

export const metadata = { title: "오늘의 시세 | 가락한상" };
export const dynamic = "force-dynamic";

/** 결정적 전일 시세 유도 — 할인율이 있으면 역산, 없으면 slug 해시 기반 소폭 등락 */
const prevPrice = (p: Product) => {
  if (p.discountRate > 0) return Math.round(p.price / (1 - p.discountRate / 100) / 100) * 100;
  let h = 0;
  for (const c of p.slug) h = (h * 31 + c.charCodeAt(0)) % 997;
  const pct = 1 + ((h % 5) + 1) / 100; // +1~5%
  return Math.round((p.price * pct) / 100) * 100;
};

/** 상품명에서 중량 추출 → 100g당 단가 */
const per100g = (p: Product) => {
  const m = p.name.match(/(\d+(?:\.\d+)?)\s*(kg|g)/i);
  if (!m) return null;
  const grams = m[2].toLowerCase() === "kg" ? Number(m[1]) * 1000 : Number(m[1]);
  if (grams <= 0) return null;
  return Math.round((p.price / grams) * 100);
};

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const depts = ["beauty", "fashion", "life", "kids", "others", "digital", "sports"];
  const active = depts.includes(cat ?? "") ? cat : undefined;

  const rows = products
    .filter((p) => (active ? (active === "beauty" ? p.category === "beauty" : p.category === active || p.category === (active === "fashion" ? "women-clothing" : active === "life" ? "home-garden" : active === "others" ? "pet" : active === "digital" ? "electronics" : "")) : true))
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .map((p) => {
      const prev = prevPrice(p);
      const diff = p.price - prev;
      const diffPct = Math.round((diff / prev) * 100);
      return { p, meta: productMeta[p.slug], prev, diff, diffPct, per100: per100g(p) };
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-14">
      <h1 className="font-display text-[24px] font-semibold">오늘의 시세</h1>
      <p className="mt-1 text-[12px] text-dim">
        매일 새벽 가락시장 경매 시세 기준 · 살수율 등급과 100g당 단가를 투명 공개
      </p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        <Link
          href="/prices"
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${!active ? "bg-ink text-white" : "border border-line bg-paper text-dim"}`}
        >
          전체
        </Link>
        {depts.map((d) => {
          const dept = departmentBySlug(d);
          return (
            <Link
              key={d}
              href={`/prices?cat=${d}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${active === d ? "bg-ink text-white" : "border border-line bg-paper text-dim"}`}
            >
              {dept?.label ?? d}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-line bg-fog px-3.5 py-2 text-[11px] font-bold text-dim sm:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <span>품목 · 점포</span>
          <span className="hidden sm:block">오늘 시세</span>
          <span className="hidden sm:block">전일 대비</span>
          <span className="text-right sm:hidden">시세</span>
          <span className="hidden sm:block">100g당</span>
        </div>
        {rows.map(({ p, meta, prev, diff, diffPct, per100 }) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-line/60 px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-fog/60 sm:grid-cols-[1.6fr_1fr_1fr_1fr]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-ink">{p.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-dim">
                {p.brand}
                {meta?.fatGrade && (
                  <span className="badge-grade-a rounded px-1 py-px text-[9px] font-bold">{meta.fatGrade}</span>
                )}
              </span>
            </span>
            <span className="hidden text-[13px] font-bold tabular-nums sm:block">{p.price.toLocaleString("ko-KR")}원</span>
            <span className={`hidden text-[12px] font-bold tabular-nums sm:block ${diff < 0 ? "text-fresh" : "text-coral"}`}>
              {diff < 0 ? `▼ ${Math.abs(diffPct)}%` : `▲ ${diffPct}%`}
            </span>
            <span className="text-right">
              <span className="block text-[13px] font-bold tabular-nums text-ink sm:hidden">{p.price.toLocaleString("ko-KR")}원</span>
              <span className={`block text-[11px] font-bold tabular-nums ${diff < 0 ? "text-fresh" : "text-coral"}`}>
                {diff < 0 ? `▼${Math.abs(diff).toLocaleString("ko-KR")}` : `▲${diff.toLocaleString("ko-KR")}`}
              </span>
              <span className="hidden text-[11px] text-dim sm:block">{per100 ? `${per100.toLocaleString("ko-KR")}원` : "—"}</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-dim">
        시세는 매일 오전 9시 갱신됩니다. 살수율 등급은 당일 자체 검수 기준이며, 실제 결제 금액은 상품 페이지에서 확인하세요.
      </p>
    </div>
  );
}