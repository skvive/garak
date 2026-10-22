"use client";
import { useEffect, useState } from "react";
import type { DressableItem, SavedLook } from "@/lib/looks/types";
export function AddToLookButton({ slug }: { slug: string }) {
  const [item,setItem]=useState<DressableItem | null>(null); const [inLook,setInLook]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{ const controller=new AbortController(); setItem(null); fetch("/api/looks",{signal:controller.signal}).then(r=>r.json()).then(data=>{ const found=data.catalog?.find((i:DressableItem)=>i.slug===slug); if(found){setItem(found);setInLook(data.look.slots[found.slot]===slug);} }).catch(()=>undefined); return ()=>controller.abort(); },[slug]);
  async function add(){if(!item || busy)return;setBusy(true);setError("");try{const response=await fetch("/api/looks");const data=await response.json();if(!response.ok)throw new Error();const look=data.look as SavedLook;const slots={...look.slots,[item.slot]:slug};if(item.slot==="dress"){delete slots.top;delete slots.bottom;}else if(item.slot==="top"||item.slot==="bottom")delete slots.dress;const saved=await fetch("/api/looks",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...look,slots})});if(!saved.ok)throw new Error();setInLook(true);}catch{setError("룩북에 담지 못했습니다. 다시 시도해 주세요.");}finally{setBusy(false);}}
  if(!item)return null;
  return <div><button type="button" disabled={busy} onClick={()=>void add()} className="w-full rounded-xl border border-ink bg-paper py-3.5 text-sm font-bold text-ink disabled:opacity-60">{busy?"담는 중…":inLook?"룩북에 담김":"룩북에 담기"}</button>{error&&<p role="alert" className="mt-2 text-sm text-coral">{error}</p>}</div>;
}
