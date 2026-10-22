"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Msg = { id: number | string; sender: "user" | "agent"; body: string; createdAt: string | Date };
type Thread = {
  id: number | string;
  subject: string;
  status: string;
  createdAt: string | Date;
  messages: Msg[];
};

export function CsChatClient({ signedIn }: { signedIn: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [subject, setSubject] = useState("배송 문의");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) return;
    const res = await fetch("/api/support/chat");
    if (!res.ok) return;
    const data = await res.json();
    setThreads(data.threads ?? []);
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = threads.find((t) => String(t.id) === String(activeId)) ?? null;

  async function startThread(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "전송 실패");
      setThreads(data.threads ?? []);
      setActiveId(data.thread?.id ?? null);
      setBody("");
      setComposing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: active.id, message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "전송 실패");
      setThreads(data.threads ?? []);
      setReply("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-line bg-fog p-6 text-center">
        <p className="text-[14px] font-semibold">1:1 채팅상담</p>
        <p className="mt-1 text-[13px] text-dim">로그인 후 문의 이력을 남길 수 있습니다</p>
        <Link
          href="/auth/sign-in"
          className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold">1:1 채팅상담</p>
        <button
          type="button"
          onClick={() => {
            setComposing(true);
            setActiveId(null);
          }}
          className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-bold text-white"
        >
          새 채팅
        </button>
      </div>

      {composing && (
        <form onSubmit={startThread} className="rounded-2xl border border-line p-4">
          <label className="block text-[12px] font-medium text-dim">
            문의 유형
            <select
              className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-[14px]"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option>배송 문의</option>
              <option>통관 · 관세</option>
              <option>반품 · 교환</option>
              <option>결제 · 환불</option>
              <option>상품 문의</option>
              <option>기타</option>
            </select>
          </label>
          <label className="mt-3 block text-[12px] font-medium text-dim">
            내용
            <textarea
              required
              rows={4}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-[14px]"
              placeholder="문의 내용을 적어 주세요"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {error && <p className="mt-2 text-[12px] text-coral">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-ink py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "전송 중…" : "문의 보내기"}
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="rounded-xl border border-line px-4 py-2.5 text-[13px] font-semibold"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {!composing && !active && (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {threads.length === 0 ? (
            <li className="p-6 text-center text-[13px] text-dim">아직 문의 이력이 없습니다</li>
          ) : (
            threads.map((t) => (
              <li key={String(t.id)}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-fog"
                >
                  <div>
                    <p className="text-[14px] font-semibold">{t.subject}</p>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-dim">
                      {t.messages[t.messages.length - 1]?.body}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-dim">
                    {t.status === "waiting" ? "답변대기" : t.status}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {active && (
        <div className="rounded-2xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <button
              type="button"
              className="text-[12px] font-semibold text-dim"
              onClick={() => setActiveId(null)}
            >
              ← 목록
            </button>
            <p className="text-[13px] font-bold">{active.subject}</p>
            <span className="text-[11px] text-dim">{active.status}</span>
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
            {active.messages.map((m) => (
              <div
                key={String(m.id)}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-ink text-white"
                      : "bg-fog text-ink"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendReply} className="flex gap-2 border-t border-line p-3">
            <input
              className="flex-1 rounded-xl border border-line px-3 py-2.5 text-[13px]"
              placeholder="추가 메시지"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <button
              type="submit"
              disabled={pending || !reply.trim()}
              className="rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
            >
              전송
            </button>
          </form>
          {error && <p className="px-4 pb-3 text-[12px] text-coral">{error}</p>}
        </div>
      )}
    </div>
  );
}
