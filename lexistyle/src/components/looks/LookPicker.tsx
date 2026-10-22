"use client";
import { useEffect, useRef, useState } from "react";
import { SLOT_LABEL, type DressableItem, type GarmentSlot, type SavedLook } from "@/lib/looks/types";
export function LookPicker({ look, catalog, activeSlot, onClose, onSaved }: { look: SavedLook; catalog: DressableItem[]; activeSlot: GarmentSlot | null; onClose: () => void; onSaved: (look: SavedLook) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  useEffect(() => { setQuery(""); setError(""); if (activeSlot) dialog.current?.showModal(); else dialog.current?.close(); }, [activeSlot]);
  async function save(slug?: string) {
    if (!activeSlot || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    const slots = { ...look.slots };
    if (slug) { slots[activeSlot] = slug; if (activeSlot === "dress") { delete slots.top; delete slots.bottom; } else if (activeSlot === "top" || activeSlot === "bottom") delete slots.dress; }
    else delete slots[activeSlot];
    try {
      const res = await fetch("/api/looks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...look, slots }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      onSaved(data.look); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { locked.current = false; setBusy(false); }
  }
  const pool = catalog.filter(i => i.slot === activeSlot && `${i.name} ${i.brand}`.toLowerCase().includes(query.toLowerCase()));
  return <dialog ref={dialog} aria-label={activeSlot ? `${SLOT_LABEL[activeSlot]} 고르기` : "상품 고르기"} onCancel={e => { if (busy) e.preventDefault(); else onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper p-5 text-ink backdrop:bg-ink/50">
    <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{activeSlot && SLOT_LABEL[activeSlot]} 고르기</h2><button type="button" disabled={busy} onClick={onClose} className="p-3 text-sm">닫기</button></div>
    <input aria-label="상품 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="상품 이름으로 검색" className="my-4 w-full rounded-lg border border-line p-3 text-sm" />
    <button type="button" disabled={busy} onClick={() => void save()} className="mb-4 w-full rounded-lg border border-line py-3 text-sm">선택 해제</button>
    {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
    {activeSlot === "dress" && <p className="mb-3 text-xs text-dim">원피스를 선택하면 상의·하의 선택이 해제됩니다.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{pool.slice(0, 120).map(item => <button type="button" key={item.slug} disabled={busy} aria-pressed={look.slots[item.slot] === item.slug} onClick={() => void save(item.slug)} className={`overflow-hidden rounded-xl border p-2 text-left disabled:opacity-50 ${look.slots[item.slot] === item.slug ? "border-ink" : "border-line"}`}><img loading="lazy" src={item.image} alt="" className="aspect-[3/4] w-full rounded-lg bg-fog object-cover" /><span className="mt-2 block text-xs text-dim">{item.brand}</span><span className="mt-1 line-clamp-2 text-sm leading-relaxed">{item.name}</span><span className="mt-2 block text-sm font-semibold tabular-nums">${item.price.toFixed(2)}</span></button>)}</div>
    {!pool.length && <p className="py-10 text-center text-sm text-dim">조건에 맞는 상품이 없습니다.</p>}
    {pool.length > 120 && <p className="mt-4 text-sm text-dim">검색어를 입력하면 더 많은 상품을 찾을 수 있습니다.</p>}
  </dialog>;
}
