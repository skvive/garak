"use client";

import type { CjWalletSnapshot } from "@/lib/hq/cj-order";

export function CjMoneyStrip({ money }: { money: CjWalletSnapshot | null }) {
  if (!money) return null;
  const fmt = (v: number) => `$${v.toFixed(2)}`;
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-[12px] font-bold">CJ 대금 (월렛){money.mock ? " · 목업" : ""}</p>
      <p className="mt-0.5 text-[12px] leading-[1.6] text-dim">고객 마진 정산과 별 장부. 잔액을 마진에 더하지 않는다.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { k: "사용가능", v: fmt(money.availableUsd) },
          { k: "결제대기", v: `${money.unpaidCount}건 ${fmt(money.unpaidSumUsd)}` },
          { k: "차액", v: `${money.makeupCount}건 ${fmt(money.makeupSumUsd)}` },
          { k: "분쟁", v: `${money.disputeCount}건` },
          { k: "동결", v: fmt(money.freezeUsd) },
        ].map((x) => (
          <div key={x.k} className="rounded-lg bg-fog px-2 py-2">
            <p className="text-[12px] text-dim">{x.k}</p>
            <p className="text-[13px] font-semibold">{x.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
