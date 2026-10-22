"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CJ_SOURCING_LIST_URL, CJ_SOURCING_PLATFORMS, type CjSourcingPlatform } from "@/lib/hq/cj-links";
import type { CjSourcingTicket, CjSourcingTicketStatus } from "@/lib/hq/cj-inventory-types";

const STATUS_KO: Record<CjSourcingTicketStatus, string> = {
  received: "접수",
  sourcing: "소싱중",
  linked: "CJ상품연결",
  closed: "종료",
};

export function CjSourcingTicketsBoard() {
  const [tickets, setTickets] = useState<CjSourcingTicket[]>([]);
  const [platform, setPlatform] = useState<CjSourcingPlatform | "all">("all");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [addPlatform, setAddPlatform] = useState<CjSourcingPlatform>("1688");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const q = platform === "all" ? "" : `?platform=${platform}`;
    const res = await fetch(`/api/hq/cj/sourcing-tickets${q}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "load failed");
    setTickets(json.tickets ?? []);
  }, [platform]);

  useEffect(() => {
    void load().catch((e) => setMsg(e instanceof Error ? e.message : "failed"));
  }, [load]);

  const add = async () => {
    setMsg("");
    try {
      const res = await fetch("/api/hq/cj/sourcing-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: addPlatform, sourceUrl, title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "create failed");
      setSourceUrl("");
      setTitle("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  const patch = async (id: number, body: Record<string, string>) => {
    await fetch(`/api/hq/cj/sourcing-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold">소싱요청</h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            카탈로그에 없는 상품을 CJ에 찾아 달라는 티켓. OpenAPI가 없어 여기서는 수동 메모다. 실제 접수는 CJ 폼·크롬 확장.
            1688 대리구매(Superbuy)와 합치지 않는다.
          </p>
        </div>
        <a className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-white" href={CJ_SOURCING_LIST_URL} target="_blank" rel="noreferrer">
          CJ 소싱
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPlatform("all")}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${platform === "all" ? "bg-ink text-white" : "bg-fog text-dim"}`}
        >
          전체
        </button>
        {CJ_SOURCING_PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ${platform === p.id ? "bg-ink text-white" : "bg-fog text-dim"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-line p-3">
        <select value={addPlatform} onChange={(e) => setAddPlatform(e.target.value as CjSourcingPlatform)} className="rounded-lg border border-line px-2 py-2 text-[13px]">
          {CJ_SOURCING_PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-line px-3 py-2 text-[13px]"
          placeholder="1688 / 타오바오 / AliExpress URL"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        <input
          className="w-[160px] rounded-lg border border-line px-3 py-2 text-[13px]"
          placeholder="메모 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="button" className="rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-white" onClick={() => void add()}>
          티켓 추가
        </button>
      </div>

      {msg && <p className="rounded-lg bg-fog p-2 text-[13px] text-dim">{msg}</p>}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full">
          <thead className="bg-fog">
            <tr>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">플랫폼</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">URL / 제목</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">상태</th>
              <th className="px-2 py-2 text-left text-[12px] font-bold text-dim">CJ pid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tickets.map((t) => (
              <tr key={t.id} className="text-[13px] leading-[1.6]">
                <td className="px-2 py-2">{t.platform}</td>
                <td className="px-2 py-2">
                  <p className="font-semibold">{t.title}</p>
                  <a className="break-all text-[12px] text-dim underline" href={t.sourceUrl} target="_blank" rel="noreferrer">{t.sourceUrl}</a>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={t.status}
                    className="rounded-lg border border-line px-2 py-1 text-[13px]"
                    onChange={(e) => void patch(t.id, { status: e.target.value })}
                  >
                    {(Object.keys(STATUS_KO) as CjSourcingTicketStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_KO[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    defaultValue={t.linkedPid ?? ""}
                    placeholder="연결 pid"
                    className="w-[140px] rounded-lg border border-line px-2 py-1 font-mono text-[12px]"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (t.linkedPid ?? "")) void patch(t.id, { linkedPid: v });
                    }}
                  />
                  {t.linkedPid && (
                    <Link className="ml-1 text-[12px] underline" href={`/hq/pipeline/catalog?q=${encodeURIComponent(t.linkedPid)}`}>
                      카탈로그
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[13px] leading-[1.6] text-dim">
                  티켓 없음. CJ에서 요청한 뒤 URL을 여기에 적어 둔다. 내 재고(선매입) 화면과 별개다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
