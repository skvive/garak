"use client";
import { useEffect, useRef, useState } from "react";

export type Portrait = { id: string; data: string };
export const PORTRAIT_KEY = "lexi-look-portrait-v1";
export function readPortrait(): Portrait | null {
  try { return JSON.parse(sessionStorage.getItem(PORTRAIT_KEY) || "null") as Portrait | null; } catch { return null; }
}
export function PortraitPicker({ portrait, onChange, disabled = false }: { portrait: Portrait | null; onChange: (p: Portrait | null) => void; disabled?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  async function select(file?: File) {
    if (!file) return;
    const seq = ++sequence.current;
    setError(""); setBusy(true);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10_000_000) throw new Error("10MB 이하의 JPG·PNG·WEBP 사진을 선택해 주세요.");
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      try {
        if (Math.min(bitmap.width, bitmap.height) < 240 || bitmap.width * bitmap.height > 32_000_000 || Math.max(bitmap.width, bitmap.height) / Math.min(bitmap.width, bitmap.height) > 4) throw new Error("가로·세로 240px 이상, 3,200만 화소 이하의 사진을 선택해 주세요.");
        const scale = Math.min(1, 1200 / bitmap.width, 1600 / bitmap.height);
        const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext("2d"); if (!context) throw new Error("사진을 읽지 못했습니다.");
        context.fillStyle = "#f5f5f3"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const next = { id: crypto.randomUUID(), data: canvas.toDataURL("image/jpeg", 0.85) };
        if (seq !== sequence.current) return;
        try { sessionStorage.setItem(PORTRAIT_KEY, JSON.stringify(next)); sessionStorage.removeItem("lexi-look-job-v1"); } catch { setError("이 브라우저에서는 임시 저장이 제한됩니다. 페이지를 이동하면 사진을 다시 선택해 주세요."); }
        onChange(next);
      } finally { bitmap.close(); }
    } catch (e) { setError(e instanceof Error ? e.message : "사진을 읽지 못했습니다."); }
    finally { if (seq === sequence.current) setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function remove() {
    sequence.current++; setBusy(false);
    try { sessionStorage.removeItem(PORTRAIT_KEY); sessionStorage.removeItem("lexi-look-job-v1"); } catch { /* storage disabled */ }
    onChange(null);
    await fetch("/api/avatar", { method: "DELETE" }).catch(() => undefined);
  }
  return <div>
    <div className="flex items-start gap-4">
      <div className="flex h-36 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-fog">
        {portrait ? <img src={portrait.data} alt="선택한 내 사진" className="h-full w-full object-cover" /> : <span className="px-3 text-center text-sm text-dim">내 사진으로<br />시작하기</span>}
      </div>
      <div className="min-w-0 text-sm leading-relaxed">
        <p className="font-semibold">얼굴이 선명한 본인 사진</p>
        <p className="mt-1 text-dim">정면·단독 사진을 선택해 주세요. 전신 사진이 있으면 포즈와 체형을 더 잘 참고할 수 있어요.</p>
        <label className="mt-3 inline-block cursor-pointer rounded-lg border border-ink px-4 py-2 font-semibold">
          {busy ? "사진 준비 중…" : portrait ? "사진 바꾸기" : "사진 선택"}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="얼굴 사진 선택" disabled={disabled || busy} onChange={e => void select(e.target.files?.[0])} className="sr-only" />
        </label>
        {portrait && <button type="button" disabled={disabled} className="ml-3 py-2 text-dim underline" onClick={() => void remove()}>사진 지우기</button>}
      </div>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-dim">사진 선택 시에는 이 탭에만 임시 보관합니다. 위치 정보를 제거하며, 생성 버튼을 누르기 전까지 AI 서비스로 보내지 않습니다.</p>
    {error && <p role="alert" className="mt-2 text-sm text-coral">{error}</p>}
  </div>;
}
