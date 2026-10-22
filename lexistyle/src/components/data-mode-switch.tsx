"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database } from "lucide-react";

type Mode = { mode: "dummy" | "real"; initialized: boolean };

/**
 * [Dummy / Real] pill 토글 — 관리자 화면 우상단. spec §4.3
 * Real 전환 = 2단계 확인(영향 요약 → 'LEXI' 타이핑) 후 실행.
 */
export function DataModeSwitch() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [modal, setModal] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/data-mode")
      .then((r) => r.json())
      .then(setMode)
      .catch(() => setMsg("모드 조회 실패"));
  }, []);

  const isReal = mode?.mode === "real";

  const commit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/data-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "real", strategy: "soft", confirm: phrase }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "전환 실패");
      setMode(json.mode);
      setModal(false);
      setMsg("Real 모드로 전환 완료 — 더미 데이터가 Soft Delete 되었습니다 (30일 후 자동 purge).");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "전환 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => !isReal && setModal(true)}
        disabled={!mode || isReal}
        aria-label="데이터 모드 전환"
        className={`flex items-center gap-2 rounded-full border px-1.5 py-1.5 text-[12px] font-bold transition-colors ${
          isReal ? "border-sage bg-sage/10 text-sage" : "border-line bg-paper"
        }`}
      >
        <span
          className={`rounded-full px-3 py-1 ${!isReal ? "bg-coral text-white" : "text-dim"}`}
        >
          Dummy
        </span>
        <span className={`rounded-full px-3 py-1 ${isReal ? "bg-sage text-white" : "text-dim"}`}>
          Real
        </span>
      </button>
      {msg && <p className="max-w-xs text-right text-[11px] text-dim">{msg}</p>}

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal>
          <button aria-label="닫기" onClick={() => setModal(false)} className="animate-fade-in absolute inset-0 bg-ink/50" />
          <div className="relative w-full max-w-md rounded-2xl bg-paper p-6 shadow-2xl">
            <p className="flex items-center gap-2 text-[15px] font-bold text-coral">
              <AlertTriangle className="size-5" /> Real 모드 전환
            </p>
            <div className="mt-3 rounded-xl bg-fog p-4 text-[13px] leading-relaxed">
              <p className="mb-2 flex items-center gap-1.5 font-bold">
                <Database className="size-4" /> 영향 요약
              </p>
              <ul className="list-disc space-y-1 pl-5 text-dim">
                <li>products / brands / reviews / orders / UGC의 모든 더미 레코드 Soft Delete</li>
                <li>30일 유예 후 Cron이 영구 삭제 (그 전까지 복구 가능)</li>
                <li>사이트 상태가 <code className="font-bold">initialized: true</code>로 영속화</li>
                <li>이 작업은 감사 로그에 기록됩니다</li>
              </ul>
            </div>
            <label className="mt-4 block text-[13px] font-medium">
              계속하려면 <span className="font-bold">LEXI</span>를 입력하세요
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-ink"
                placeholder="LEXI"
              />
            </label>
            <div className="mt-5 flex gap-2.5">
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-line py-3 text-[13px] font-bold">
                취소
              </button>
              <button
                onClick={commit}
                disabled={phrase !== "LEXI" || busy}
                className="flex-1 rounded-xl bg-coral py-3 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {busy ? "전환 중…" : "Real로 전환"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
