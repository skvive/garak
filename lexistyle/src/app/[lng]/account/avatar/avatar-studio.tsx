"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PortraitPicker, readPortrait, type Portrait } from "@/components/looks/PortraitPicker";
export function AvatarStudio() {
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const params = useParams(); const lng = typeof params.lng === "string" ? params.lng : "ko";
  useEffect(() => setPortrait(readPortrait()), []);
  return <div className="mx-auto max-w-lg px-4 py-10 leading-relaxed" style={{ wordBreak: "keep-all" }}><h1 className="mb-3 font-display text-3xl font-semibold">내 피팅 사진</h1><p className="mb-6 text-sm text-dim">얼굴이 선명한 본인 사진을 선택하고 룩북에서 원하는 상품을 입혀보세요. 이 탭에 임시 보관하며, AI 전송 동의는 생성 전에 받습니다.</p><PortraitPicker portrait={portrait} onChange={setPortrait} /><Link href={`/${lng}/looks`} className="mt-6 block rounded-xl bg-ink py-4 text-center text-sm font-semibold text-white">룩북에서 입혀보기</Link></div>;
}
