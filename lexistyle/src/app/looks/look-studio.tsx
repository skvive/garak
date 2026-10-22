"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LookPicker } from "@/components/looks/LookPicker";
import { TryOnPanel } from "@/components/looks/TryOnPanel";
import { PortraitPicker, readPortrait, type Portrait } from "@/components/looks/PortraitPicker";
import { GARMENT_SLOTS, SLOT_LABEL, type DressableItem, type GarmentSlot, type SavedLook } from "@/lib/looks/types";
export function LookStudio({ intro }: { intro?: string }) {
  const router = useRouter(); const params = useParams(); const lng = typeof params.lng === "string" ? params.lng : "ko";
  const [look, setLook] = useState<SavedLook | null>(null);
  const [catalog, setCatalog] = useState<DressableItem[]>([]);
  const [activeSlot, setActiveSlot] = useState<GarmentSlot | null>(null);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [consent, setConsent] = useState(false); const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false); const [generating, setGenerating] = useState(false);
  const [available, setAvailable] = useState(false); const [error, setError] = useState(""); const [reload, setReload] = useState(0);
  useEffect(() => {
    setPortrait(readPortrait()); const controller = new AbortController(); setError("");
    fetch("/api/looks", { signal: controller.signal }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setLook(data.look); setCatalog(data.catalog); }).catch(e => { if (!controller.signal.aborted) setError(e.message || "상품을 불러오지 못했습니다."); });
    fetch("/api/vto", { signal: controller.signal }).then(r => r.json()).then(data => setAvailable(data.available === true)).catch(() => undefined);
    return () => controller.abort();
  }, [reload]);
  async function cart() {
    setBusy(true); setError("");
    try { const res = await fetch("/api/looks/cart", { method: "POST" }); const data = await res.json(); if (!res.ok || !data.count) throw new Error(data.error || "담을 상품이 없습니다."); router.push(`/${lng}/cart`); }
    catch(e) { setError(e instanceof Error ? e.message : "장바구니에 담지 못했습니다."); }
    finally { setBusy(false); }
  }
  const count = look ? Object.keys(look.slots).length : 0;
  return <div id="studio" className="mx-auto max-w-6xl px-4 py-8 tracking-normal md:px-8 md:py-14" style={{ wordBreak: "keep-all" }}>
    <header className="mb-8 border-b border-line pb-7"><p className="mb-3 text-xs font-semibold text-dim">LEXI · PERSONAL LOOKBOOK</p><h1 className="font-display text-4xl font-semibold leading-relaxed md:text-5xl" style={{ textWrap: "balance" }}>나를 위한 룩북</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{intro || "내 얼굴로, 마음에 드는 옷과 가방과 신발까지. 나만의 조합을 골라 한 장의 착장으로 만나보세요."}</p></header>
    {error && <div role="alert" className="mb-6 rounded-xl border border-line p-4 text-sm text-coral">{error} {!look && <button className="ml-3 underline" onClick={() => setReload(n => n+1)}>다시 불러오기</button>}</div>}
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
      <div className="space-y-8">
        <section><h2 className="mb-4 text-lg font-semibold"><span className="mr-3 text-dim">01</span>내 사진</h2><PortraitPicker portrait={portrait} disabled={generating} onChange={p => { setPortrait(p); setConsent(false); setAdult(false); }} /></section>
        <section className="border-t border-line pt-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold"><span className="mr-3 text-dim">02</span>스타일 조합</h2><span className="text-xs tabular-nums text-dim">{count}개 선택</span></div>
          {look ? <><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{GARMENT_SLOTS.map(slot => { const item = catalog.find(i => i.slug === look.slots[slot]); return <button key={slot} type="button" disabled={generating || busy} onClick={() => setActiveSlot(slot)} aria-label={`${SLOT_LABEL[slot]} ${item ? "바꾸기" : "고르기"}`} className={`overflow-hidden rounded-xl border text-left disabled:opacity-50 ${item ? "border-ink/30" : "border-line"}`}><div className="flex aspect-[3/4] items-center justify-center bg-fog">{item ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="text-2xl font-light text-dim">+</span>}</div><div className="p-2"><span className="block text-xs font-semibold">{SLOT_LABEL[slot]}</span><span className="mt-1 block truncate text-[11px] text-dim">{item ? item.name : "선택하기"}</span></div></button>; })}</div>
          <label className="mt-5 flex items-center justify-between text-sm">어떤 날의 스타일인가요?<select aria-label="스타일 상황" value={["일상", "출근", "여행", "모임"].includes(look.occasion) ? look.occasion : "일상"} disabled={generating} onChange={e => setLook({ ...look, occasion: e.target.value })} className="rounded-lg border border-line bg-paper px-4 py-2">{["일상", "출근", "여행", "모임"].map(o => <option key={o}>{o}</option>)}</select></label>
          <p className="mt-3 text-xs leading-relaxed text-dim">상품 선택은 자동 저장됩니다. 원피스와 상의·하의는 번갈아 선택할 수 있어요.</p></> : <p role="status" className="py-8 text-sm text-dim">{error ? "상품 목록을 다시 불러와 주세요." : "상품을 불러오는 중…"}</p>}
        </section>
        <section className="space-y-3 border-t border-line pt-6 text-sm leading-relaxed"><label className="flex items-start gap-3"><input type="checkbox" checked={adult} disabled={generating} onChange={e => setAdult(e.target.checked)} className="mt-1 size-4 shrink-0" /><span>만 19세 이상이며, 사진은 제 본인 사진입니다.</span></label><label className="flex items-start gap-3"><input type="checkbox" checked={consent} disabled={generating} onChange={e => setConsent(e.target.checked)} className="mt-1 size-4 shrink-0" /><span>가상 착장 생성을 위해 선택한 사진과 상품 이미지를 Alibaba Cloud Wan으로 전송·처리하는 데 동의합니다.</span></label><p className="text-xs text-dim">LEXI는 원본 사진을 공개 저장하지 않습니다. AI 처리 과정에는 외부 서비스의 보관 정책이 적용됩니다. 사진 지우기로 이 탭의 사진·결과를 지울 수 있으며, 다운로드한 파일은 기기에 남습니다.</p></section>
      </div>
      <section className="rounded-2xl border border-line p-5 md:p-7"><h2 className="mb-5 text-lg font-semibold"><span className="mr-3 text-dim">03</span>나의 착장</h2>
        {!portrait && <div className="mb-5 flex min-h-64 flex-col justify-center rounded-xl bg-fog p-8 text-center"><p className="font-display text-2xl">당신의 다음 스타일</p><p className="mt-3 text-sm leading-relaxed text-dim">사진과 상품을 선택하면<br />이곳에 나만의 착장이 완성됩니다.</p></div>}
        {look && <TryOnPanel look={look} portrait={portrait} consent={consent} adult={adult} available={available} onBusy={setGenerating} />}
        <button type="button" onClick={() => void cart()} disabled={busy || generating || !count} className="mt-5 w-full rounded-xl border border-line py-3 text-sm font-semibold disabled:opacity-40">{busy ? "담는 중…" : "선택한 상품 장바구니 담기"}</button>
      </section>
    </div>
    {look && <LookPicker look={look} catalog={catalog} activeSlot={activeSlot} onClose={() => setActiveSlot(null)} onSaved={setLook} />}
  </div>;
}
