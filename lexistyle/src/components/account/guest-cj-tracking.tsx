"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, PackageSearch, Truck } from "lucide-react";

type TrackRoute = { time: string; place?: string; text: string };
const TRACK_STAGES = ["결제 완료", "상품 준비", "출고", "해외 이동", "배달 중", "배송 완료"] as const;

type Shipment = {
  lookupKind: "order" | "tracking";
  reference: string;
  trackingNo?: string;
  carrier: string;
  orderStatus?: string;
  stageIndex: number;
  stageLabel: string;
  routes: TrackRoute[];
  fetchedAt: string;
};

export function GuestCjTracking({ lng }: { lng: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setShipment(null);
    try {
      const response = await fetch(`/${lng}/api/public/cj-tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "배송 정보를 조회하지 못했습니다.");
      setShipment(data.shipment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "배송 정보를 조회하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-line bg-paper p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-fog"><PackageSearch className="size-5 text-ink" /></span>
          <span><strong className="block text-[15px] text-ink">비회원 배송조회</strong><span className="mt-0.5 block text-[12px] leading-5 text-dim">CJ 주문번호 또는 운송장 번호로 한 건만 조회</span></span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-dim transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-5 border-t border-line pt-5">
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="guest-cj-reference">CJ 주문번호 또는 운송장 번호</label>
            <input
              id="guest-cj-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              required
              minLength={6}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              placeholder="CJ 주문번호 또는 운송장 번호"
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-3 font-mono text-[13px] text-ink outline-none focus:border-ink"
            />
            <button type="submit" disabled={busy} className="rounded-full bg-ink px-5 py-3 text-[13px] font-bold text-white disabled:opacity-60">
              {busy ? "조회 중" : "배송조회"}
            </button>
          </form>
          <p className="mt-2 text-[11px] leading-5 text-dim">로그인 없이 해당 번호의 배송 상태만 표시합니다. 주소·연락처·결제정보는 표시하지 않습니다.</p>
          {error && <p role="alert" className="mt-4 rounded-2xl bg-fog p-4 text-[13px] leading-6 text-ink">{error}</p>}

          {shipment && (
            <div className="mt-5 space-y-4" aria-live="polite">
              <div className="rounded-2xl bg-fog p-4">
                <div className="flex items-center gap-2"><Truck className="size-5 text-sage" /><strong className="text-[15px] text-ink">{shipment.stageLabel}</strong></div>
                <p className="mt-2 break-all font-mono text-[12px] text-dim">{shipment.trackingNo ?? shipment.reference}</p>
                <p className="mt-1 text-[12px] text-dim">{[shipment.carrier, shipment.orderStatus].filter(Boolean).join(" · ")}</p>
                <ol className="mt-4 grid grid-cols-6 gap-1" aria-label={`현재 ${shipment.stageLabel}`}>
                  {TRACK_STAGES.map((label, index) => (
                    <li key={label} className="min-w-0 text-center">
                      <span className={`mx-auto block h-1.5 rounded-full ${index <= shipment.stageIndex ? "bg-ink" : "bg-line"}`} />
                      <span className={`mt-2 block text-[10px] leading-4 ${index === shipment.stageIndex ? "font-bold text-ink" : "text-dim"}`}>{label}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {shipment.routes.length > 0 && (
                <ol className="space-y-3 rounded-2xl border border-line p-4">
                  {shipment.routes.map((route, index) => (
                    <li key={`${route.time}-${index}`} className="flex gap-3">
                      <span className={`mt-2 size-2 shrink-0 rounded-full ${index === 0 ? "bg-ink" : "bg-line"}`} />
                      <div><p className="text-[13px] leading-6 text-ink">{route.text}</p><p className="text-[11px] leading-5 text-dim">{[route.time, route.place].filter(Boolean).join(" · ")}</p></div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-[11px] text-dim">마지막 조회 {new Date(shipment.fetchedAt).toLocaleString("ko-KR")}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
