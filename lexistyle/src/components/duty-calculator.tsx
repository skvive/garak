"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { dutyTable } from "@/lib/dummy-data";

/** 배송권역·배송비 사전 계산 — PDP 인라인에서 배송 불확실성 제거 (가락한상) */
export function DutyCalculator({ price }: { price: number }) {
  const [zone, setZone] = useState("SONGPANG");
  const d = dutyTable[zone];
  const freeShipping = price >= d.freeUnder;
  const shipping = freeShipping ? 0 : d.shipping;
  const total = +(price + shipping).toFixed(0);

  return (
    <div className="rounded-xl border border-sage/30 bg-sage/5 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-sage">
          <Truck className="size-4" strokeWidth={2} /> 배송권역·배송비 사전 계산
        </p>
        <select
          aria-label="배송권역"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="rounded-md border border-line bg-paper px-2 py-1 text-[12px] font-medium"
        >
          {Object.entries(dutyTable).map(([code, v]) => (
            <option key={code} value={code}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <dl className="price space-y-1 text-[13px]">
        <div className="flex justify-between text-dim">
          <dt>상품가</dt>
          <dd>{price.toLocaleString("ko-KR")}원</dd>
        </div>
        <div className="flex justify-between text-dim">
          <dt>
            배송비 {freeShipping && <span className="text-sage">(무료배송 구간)</span>}
          </dt>
          <dd>{shipping.toLocaleString("ko-KR")}원</dd>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-sage/20 pt-1.5 text-[15px] font-bold text-ink">
          <dt>총 결제 예상액</dt>
          <dd>{total.toLocaleString("ko-KR")}원</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-dim">
        반경 10km(강남·서초·송파·강동·위례)는 당일 3시간 배송. 추가 비용 없는 최종가입니다.
      </p>
    </div>
  );
}
