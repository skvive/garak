"use client";

import { useEffect, useState } from "react";

/** PDP 문서 HTML을 팝업 iframe으로 표시 (P4 익스포트 상품번호 클릭) */
export function ProductPreviewModal({
  documentId,
  onClose,
}: {
  documentId: number;
  onClose: () => void;
}) {
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const res = await fetch(`/api/hq/pdp/${documentId}/html`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!stopped) {
          setHtml(json.html ?? "");
          setTitle(json.title ?? "");
        }
      } catch (e) {
        if (!stopped) setErr(e instanceof Error ? e.message : "미리보기 로드 실패");
      }
    })();
    return () => {
      stopped = true;
    };
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{title || `상품 페이지 #${documentId}`}</h3>
          <button onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold">닫기</button>
        </div>
        {err ? (
          <p className="text-[13px] text-coral">{err}</p>
        ) : html ? (
          // eslint-disable-next-line jsx-a11y/iframe-has-title
          <iframe title={`상품 미리보기 ${documentId}`} srcDoc={html} className="h-[60vh] w-full rounded-xl border border-line" />
        ) : (
          <p className="text-[13px] text-dim">미리보기 로딩 중…</p>
        )}
      </div>
    </div>
  );
}