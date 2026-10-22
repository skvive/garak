// filepath: src/components/admin/cafe24-panel.tsx
"use client";

import { useEffect, useState } from "react";

type Status = {
  mode: string;
  configured: boolean;
  adminConfigured: boolean;
  oauthConfigured?: boolean;
  connected?: boolean;
  mallId: string | null;
  ping?: string;
  productCount?: number;
  productSample?: Array<{ slug: string; name: string; cafe24ProductNo: number }>;
  error?: string;
  note?: string;
};

export function Cafe24Panel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [syncMsg, setSyncMsg] = useState("");

  async function load() {
    const res = await fetch("/api/cafe24/status");
    setStatus(await res.json());
  }

  useEffect(() => {
    void load();
    // OAuth 콜백 복귀 시 알림 (원인 세분화)
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("cafe24");
    const msg = sp.get("msg") ?? "";
    if (p === "connected") setSyncMsg("✓ 카페24 연결 완료 — 전 상품이 프론트에 노출됩니다");
    else if (p) setSyncMsg(`✖ 연결 실패 [${p}] ${msg}`);
  }, []);

  async function sync() {
    setSyncMsg("동기화 중…");
    const res = await fetch("/api/cafe24/sync", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setSyncMsg(data.error || "실패");
      return;
    }
    setSyncMsg(`Neon에 ${data.upserted}/${data.total}건 upsert 완료`);
    await load();
  }

  if (!status) return <p className="text-[13px] text-dim">Cafe24 상태 확인 중…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line p-4 text-[13px]">
        <p className="font-bold">Cafe24 Headless</p>
        <ul className="mt-2 space-y-1 text-dim">
          <li>mode: {status.mode}</li>
          <li>connected: <span className={status.connected ? "font-bold text-sage" : "text-coral"}>{status.connected ? "✓ 연결됨" : "미연결"}</span></li>
          <li>mall: {status.mallId || "—"}</li>
          <li>ping: {status.ping ?? "—"}</li>
          <li>products: {status.productCount ?? "—"}</li>
        </ul>
        {status.note && <p className="mt-2 text-[12px]">{status.note}</p>}
        {status.error && <p className="mt-2 text-coral">{status.error}</p>}
      </div>

      {/* OAuth 원클릭 연결 */}
      <div className="rounded-2xl border border-line p-4">
        <p className="text-[13px] font-bold">카페24 계정 연결</p>
        <p className="mt-1 text-[12px] text-dim">
          {status.connected
            ? "연결됨 — 토큰은 2시간마다 자동 갱신됩니다. 계정을 바꾸려면 다시 연결하세요."
            : "카페24 로그인·동의 한 번으로 전 상품을 프론트에 상시 노출합니다."}
        </p>
        <a
          href="/api/cafe24/oauth/start"
          className={`mt-3 inline-block rounded-xl px-4 py-3 text-[13px] font-bold ${
            status.oauthConfigured ? "bg-ink text-white" : "pointer-events-none bg-fog text-dim"
          }`}
        >
          {status.connected ? "카페24 다시 연결" : "카페24 연결 →"}
        </a>
        {!status.oauthConfigured && (
          <p className="mt-2 text-[12px] text-coral">
            CAFE24_MALL_ID · CAFE24_FRONT_CLIENT_ID · CAFE24_CLIENT_SECRET 설정 필요
          </p>
        )}
      </div>

      {status.productSample && status.productSample.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line text-[13px]">
          {status.productSample.map((p) => (
            <li key={p.slug} className="p-3">
              <span className="font-semibold">{p.name}</span>
              <span className="ml-2 text-dim">
                #{p.cafe24ProductNo} · {p.slug}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={sync}
        disabled={!status.configured}
        className="rounded-xl bg-ink px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40"
      >
        Cafe24 → Neon Sync
      </button>
      {syncMsg && <p className="text-[12px] text-dim">{syncMsg}</p>}
    </div>
  );
}
