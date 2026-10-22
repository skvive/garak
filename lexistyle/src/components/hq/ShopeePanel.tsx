"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Health = {
  health: string;
  note: string;
  shopId: string;
  listingMode: string;
  partner: boolean;
  shop: boolean;
  token: boolean;
  region?: string;
  shopName?: string;
  lastSuccessAt?: string;
  lastError?: string;
};

export function ShopeePanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function load(probe = false) {
    const res = await fetch(`/api/hq/channels/shopee${probe ? "?probe=1" : ""}`);
    setHealth(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function probe() {
    setBusy("probe");
    setMsg("");
    try {
      await load(true);
      setMsg("연결 확인 완료");
    } catch {
      setMsg("연결 확인 실패");
    } finally {
      setBusy("");
    }
  }

  async function syncStock() {
    setBusy("stock");
    setMsg("");
    try {
      const res = await fetch("/api/hq/channels/shopee", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sync-stock" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setMsg(`재고 투영 ${d.ok ?? 0}/${d.total ?? 0}건`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "재고 동기화 실패");
    } finally {
      setBusy("");
    }
  }

  if (!health) return <p className="text-[13px] text-dim">Shopee SEA 상태 확인 중…</p>;

  const live = health.health === "live";

  return (
    <div className="space-y-3 rounded-2xl border border-line p-4 text-[13px] leading-relaxed">
      <p className="font-bold">Shopee SEA · Export 판매처</p>
      <p className="text-[12px] text-dim">
        Seller Center 없이 HQ Export로 리스팅·주문·송장을 일괄 관리합니다. 1호 마켓은 SG입니다.
      </p>
      <ul className="space-y-1 text-dim">
        <li>
          상태:{" "}
          <span className={live ? "font-bold text-sage" : "text-coral"}>
            {health.health} · {health.note}
          </span>
        </li>
        <li>shop: {health.shopName ?? "—"} · {health.region ?? "SEA"} · id {health.shopId || "—"}</li>
        <li>listing mode: {health.listingMode} (live는 SHOPEE_LISTING_MODE=live)</li>
        <li>Partner {health.partner ? "있음" : "없음"} · Shop {health.shop ? "있음" : "없음"} · Token {health.token ? "있음" : "없음"}</li>
        {health.lastError && <li className="text-coral">마지막 오류: {health.lastError}</li>}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40" onClick={() => void probe()}>
          Open API 연결 확인
        </button>
        <button type="button" disabled={!!busy || !live} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold disabled:opacity-40" onClick={() => void syncStock()}>
          CJ 재고 → Shopee
        </button>
        <Link href="/hq/pipeline/export" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">
          Export 파이프라인
        </Link>
        <Link href="/hq/purchase-requests?channel=shopee" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">
          주문
        </Link>
      </div>
      {msg && <p className="text-[12px] text-dim">{msg}</p>}
    </div>
  );
}
