import Image from "next/image";
import Link from "next/link";
import { heroSlides, shopTheLook } from "@/lib/dummy-data";

export const metadata = { title: "Trend" };

export default function TrendPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-[30px] font-semibold">Trend</h1>
      <p className="mt-1 text-[13px] text-dim">서울의 이번 주 — 에디토리얼과 Shop the Look</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[...heroSlides.map((s) => ({ image: s.image, title: s.headline.replace("\n", " "), sub: s.sub, href: s.href })), { image: shopTheLook.image, title: shopTheLook.title, sub: "핀을 눌러 착장 그대로 담기", href: "/" }].map((e) => (
          <Link key={e.title} href={e.href} className="group overflow-hidden rounded-2xl border border-line">
            <div className="relative aspect-[4/3] overflow-hidden bg-fog">
              <Image src={e.image} alt="" fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-4">
              <p className="font-display text-[18px] font-semibold">{e.title}</p>
              <p className="mt-1 line-clamp-2 text-[13px] text-dim">{e.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
