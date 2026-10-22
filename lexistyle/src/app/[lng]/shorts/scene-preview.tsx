"use client";
import { useEffect, useState } from "react";
import type { ShortScript } from "@/lib/shorts/script";

/** 9:16 브라우저 미리보기 — 최종 MP4와 같은 씬 순서·자막·후킹 배너 */
export function ScenePreview({ script, images }: { script: ShortScript; images: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [script]);
  useEffect(() => {
    const t = setTimeout(() => setI((x) => (x + 1) % script.scenes.length), (script.scenes[i]?.duration ?? 3) * 1000);
    return () => clearTimeout(t);
  }, [i, script]);
  const sc = script.scenes[i] ?? script.scenes[0];
  const src = images[sc.imageIndex] ?? images[0];
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-3xl bg-ink">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${i}-${src}`} src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ animation: "shortsZoom 5s ease-out both" }} />
      ) : null}
      <div className="absolute inset-x-0 top-0 h-1 bg-white/20">
        <div className="h-full bg-coral transition-all" style={{ width: `${((i + 1) / script.scenes.length) * 100}%` }} />
      </div>
      <div className="absolute inset-x-3 top-6 rounded-xl bg-ink/80 px-3 py-2 text-center text-sm font-bold text-white">{script.hookText}</div>
      <div className="absolute inset-x-3 bottom-16 flex justify-center">
        <span className="rounded-xl bg-black/60 px-3 py-2 text-center text-base font-bold leading-snug text-white">{sc.overlayText}</span>
      </div>
      {i === script.scenes.length - 1 ? (
        <div className="absolute inset-x-8 bottom-5 rounded-full bg-coral py-2 text-center text-xs font-bold text-white">{script.cta}</div>
      ) : null}
      <style>{`@keyframes shortsZoom{from{transform:scale(1)}to{transform:scale(1.08)}}`}</style>
    </div>
  );
}
