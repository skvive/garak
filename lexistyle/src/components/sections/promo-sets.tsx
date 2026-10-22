import Image from "next/image";
import Link from "next/link";

/** 기획전 4종 — 피쉬세일식 기획전 배너 (홈파티/회식/선물/김장) */
const PROMOS = [
  { title: "금요 사무실 회식", sub: "법인카드 OK · 데스크 직배송", href: "/category/fashion", kw: "party,food", seed: 131 },
  { title: "주말 홈파티 한 상", sub: "회부터 디저트까지 원스톱", href: "/category/fashion", kw: "sashimi,set", seed: 132 },
  { title: "명절 선물세트", sub: "갈비·과일·굴비 프리미엄", href: "/category/life", kw: "gift,korean", seed: 133 },
  { title: "김장철 젓갈·반찬", sub: "가락시장 청과동 직송", href: "/category/others", kw: "kimchi,korean", seed: 134 },
];

export function PromoSets() {
  return (
    <section aria-label="기획전" className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[18px] font-bold text-ink">기획전</h2>
        <span className="text-[12px] text-dim">가락한상이 고른 오늘의 테마</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PROMOS.map((p) => (
          <Link
            key={p.title}
            href={p.href}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl"
          >
            <Image
              src={`https://loremflickr.com/600/450/${encodeURIComponent(p.kw)}?lock=${p.seed}`}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="img-scrim absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="text-[14px] font-bold">{p.title}</p>
              <p className="mt-0.5 text-[11px] text-white/80">{p.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
