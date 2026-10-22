"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/commerce";

export type NotifDto = {
  id: number | string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
};

const TONE: Record<string, BadgeTone> = {
  order: "express",
  promo: "sale",
  system: "neutral",
  info: "fresh",
};

export function NotificationsClient({ initial }: { initial: NotifDto[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState(false);

  async function markAll() {
    setPending(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setPending(false);
    router.refresh();
  }

  async function markOne(id: number | string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) =>
      prev.map((n) =>
        String(n.id) === String(id) ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      ),
    );
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-fog p-8 text-center">
        <p className="text-[14px] font-semibold">새 알림이 없습니다</p>
        <p className="mt-1 text-[12px] text-dim">주문·특가·시스템 안내가 여기에 모입니다</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={markAll}
          className="text-[12px] font-semibold text-dim hover:text-ink disabled:opacity-40"
        >
          모두 읽음
        </button>
      </div>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {items.map((n) => {
          const unread = !n.readAt;
          const inner = (
            <div className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone={TONE[n.type] ?? "neutral"}>{n.type}</Badge>
                  {unread && <span className="size-1.5 rounded-full bg-coral" />}
                </div>
                <p className={`mt-1.5 text-[14px] ${unread ? "font-bold" : "font-medium"}`}>
                  {n.title}
                </p>
                {n.body && <p className="mt-0.5 text-[12px] leading-relaxed text-dim">{n.body}</p>}
                <p className="mt-1 text-[11px] text-dim">
                  {new Date(n.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>
          );
          return (
            <li key={String(n.id)} className={unread ? "bg-fog/40" : undefined}>
              {n.href ? (
                <Link
                  href={n.href}
                  onClick={() => {
                    if (unread) void markOne(n.id);
                  }}
                  className="block hover:bg-fog"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  className="block w-full text-left hover:bg-fog"
                  onClick={() => {
                    if (unread) void markOne(n.id);
                  }}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
