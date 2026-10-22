"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const API = "/ko/api/account/orders/coupang";

/** 관리자 로그인 시에만 노출 — 쿠팡 신규 주문을 CJ로 즉시 전송 */
export function CoupangSyncButton() {
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(API, { cache: "no-store" })
      .then((r) => setAdmin(r.ok))
      .catch(() => setAdmin(false));
  }, []);

  if (!admin) return null;

  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const post = (action: "pull" | "send") =>
        fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then(async (r) => ({ ok: r.ok, d: await r.json() }));
      const pulled = await post("pull");
      if (!pulled.ok) return setMsg(`실패: ${pulled.d.error ?? "조회 오류"}`);
      const sent = await post("send");
      if (!sent.ok) return setMsg(`실패: ${sent.d.error ?? "전송 오류"}`);
      const created = pulled.d.result?.created ?? 0;
      const n = sent.d.result?.sent ?? 0;
      const failed = sent.d.result?.failed ?? 0;
      setMsg(created || n ? `신규 ${created}건 · CJ 전송 ${n}건${failed ? ` · 실패 ${failed}건` : ""}` : "신규 주문 없음");
    } catch {
      setMsg("실패: 네트워크 오류");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 8000);
    }
  }

  return (
    <div className="relative mr-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-medium text-paper hover:bg-coral disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} strokeWidth={2} />
        <span className="hidden sm:inline">{busy ? "동기화 중…" : "쿠팡 주문 동기화"}</span>
      </button>
      {msg && (
        <p role="status" className="absolute right-0 top-11 z-50 w-max max-w-[260px] rounded-lg border border-line bg-paper px-3 py-2 text-[13px] shadow-md">
          {msg}
        </p>
      )}
    </div>
  );
}
