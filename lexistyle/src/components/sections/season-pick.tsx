import Link from "next/link";
import { finalPrice, products } from "@/lib/dummy-data";

/** 제철 픽 3종 — 오늘회식 에디토리얼 카피 ("겨울에 꼭 먹어봐야 하는 회 1위🐟") */
const PICKS = [
  { slug: "bangeo-hoe", emoji: "🐟", kicker: "겨울에 꼭 먹어봐야 하는 회 1위", story: "제주 모슬포 대방어 — 뱃살 두툼, 지금이 제철" },
  { slug: "king-crab-a", emoji: "🦀", kicker: "살수율 A급 보증", story: "찜기 없이 살짝 데워 드세요 — 5℃ 콜드체인 유지" },
  { slug: "ddak-saeu", emoji: "🦐", kicker: "회린이도 쉬운 달콤한 맛", story: "제주 딱새우회 — 감칠맛 가득한 제철 별미" },
];

export function SeasonPick() {
  const items = PICKS.map((p) => {
    const prod = products.find((x) => x.slug === p.slug);
    return prod ? { ...p, prod } : null;
  }).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <section aria-label="제철 추천" className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[18px] font-bold text-ink">지금이 제철</h2>
        <Link href="/best" className="text-[12px] font-medium text-sage hover:underline">
          오늘의 시세 보기 →
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="group rounded-xl border border-line bg-fog/60 p-4 transition-shadow hover:shadow-md"
          >
            <p className="text-[22px]">{p.emoji}</p>
            <p className="mt-2 text-[11px] font-bold text-coral">{p.kicker}</p>
            <p className="mt-1 line-clamp-1 text-[15px] font-bold text-ink">{p.prod.name}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-dim">{p.story}</p>
            <p className="price mt-2 text-[16px] font-semibold text-ink">
              {finalPrice(p.prod).toLocaleString("ko-KR")}원
              <span className="ml-2 text-[12px] font-normal text-coral group-hover:underline">
                자세히 보기 →
              </span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
