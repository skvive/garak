"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { heroSlides } from "@/lib/dummy-data";

/**
 * Hero Editorial — 자동 전환 없이 스와이프 수동 전환(사용자 통제감),
 * 도트 대신 진행바. spec §3.4 #2
 */
export function HeroEditorial() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <section aria-label="에디토리얼 하이라이트" className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {heroSlides.map((s) => (
          <div
            key={s.id}
            className="relative aspect-[4/5] w-full shrink-0 snap-center md:aspect-auto md:h-[min(78svh,780px)]"
          >
            {/* 모바일 세로 JPG + object-top / 데스크톱 landscape contain — 두상 잘림 방지 */}
            <Image
              src={s.image}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="hidden scale-110 object-cover object-top blur-2xl brightness-[.55] md:block"
            />
            <Image
              src={"imagePortrait" in s && typeof s.imagePortrait === "string" ? s.imagePortrait : s.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_8%] md:hidden"
            />
            <Image
              src={s.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="hidden object-contain object-top md:block"
            />
            <div className="ocean-hero-overlay absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-12 text-white">
              <p className="text-[11px] font-bold tracking-[0.22em] text-coral">{s.eyebrow}</p>
              <h2
                className="font-display mt-2 whitespace-pre-line text-[40px] font-semibold leading-[1.02] md:text-[64px]"
                style={{ textWrap: "balance" }}
              >
                {s.headline}
              </h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/90 md:text-[15px]">
                {s.sub}
              </p>
              <Link
                href={s.href}
                className="mt-5 inline-block rounded-full border border-white/70 px-6 py-2.5 text-[13px] font-bold tracking-wide backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
              >
                {s.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* 진행바 */}
      <div className="absolute bottom-5 left-1/2 flex w-24 -translate-x-1/2 gap-1" role="tablist" aria-label="슬라이드 위치">
        {heroSlides.map((s, i) => (
          <span
            key={s.id}
            role="tab"
            aria-selected={i === index}
            className={`h-0.5 flex-1 rounded-full transition-colors ${
              i === index ? "bg-white" : "bg-white/35"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
