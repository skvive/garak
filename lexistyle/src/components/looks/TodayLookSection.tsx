"use client";
import { useState } from "react";
import Link from "next/link";
import { TODAY_LOOK_COMPOSE } from "@/lib/looks/compose";
import { FIT_DISCLAIMER } from "@/lib/looks/types";
export function TodayLookSection() {
  const [alternate, setAlternate] = useState(false);
  return <section className="mx-auto max-w-6xl px-4 py-8 leading-relaxed" style={{ wordBreak: "keep-all" }}><div className="mx-auto max-w-sm"><h2 className="text-2xl font-semibold">나만의 룩북</h2><p className="mt-2 text-sm text-dim">내 얼굴로 옷·가방·신발을 함께 입혀보세요.</p><figure className="mt-4"><img src={alternate ? TODAY_LOOK_COMPOSE.b : TODAY_LOOK_COMPOSE.a} alt="AI 모델로 만든 착장 예시" className="w-full rounded-2xl bg-fog" /><figcaption className="mt-2 text-xs text-dim">AI 모델 착장 예시 · 고객 사진이나 현재 선택한 상품의 결과가 아닙니다. {FIT_DISCLAIMER}</figcaption></figure><Link href="/looks" className="mt-4 block rounded-xl bg-ink py-4 text-center text-sm font-semibold text-white">내 사진으로 룩북 만들기</Link><button type="button" className="mt-3 w-full py-2 text-sm text-dim underline" onClick={() => setAlternate(v => !v)}>다른 예시 보기</button></div></section>;
}
