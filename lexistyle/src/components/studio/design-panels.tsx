"use client";

import { useEffect, useState } from "react";

type Theme = {
  id: number;
  name: string;
  tokens: Record<string, string>;
  status: string;
  version: number;
};

type Section = {
  id: number;
  slot: string;
  title: string;
  payload: Record<string, unknown>;
  sort: number;
  status: string;
  version: number;
};

const DEFAULT_TOKENS = {
  ink: "#111114",
  paper: "#FFFFFF",
  fog: "#F5F5F3",
  coral: "#FF5C4D",
  sage: "#5C7A6E",
  gold: "#C9A05C",
  displayFont: "Playfair Display",
  bodyFont: "Pretendard",
  radius: "16px",
};

export function ThemesPanel() {
  const [items, setItems] = useState<Theme[]>([]);
  const [name, setName] = useState("LEXI Editorial");
  const [tokens, setTokens] = useState(DEFAULT_TOKENS);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/studio/themes");
    const data = await res.json();
    setItems(data.items ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/studio/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tokens }),
    });
    const data = await res.json();
    setMessage(res.ok ? "테마 초안을 저장했습니다." : data.error);
    if (res.ok) await load();
  }

  async function publish(id: number) {
    const res = await fetch("/api/studio/themes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "published" }),
    });
    setMessage(res.ok ? "테마를 published로 전환했습니다." : "게시 실패");
    await load();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={create} className="rounded-2xl border border-line bg-paper p-5">
        <p className="text-[15px] font-bold">새 테마</p>
        <label className="mt-4 block text-[11px] font-bold text-dim">
          이름
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[13px] text-ink"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Object.entries(tokens)
            .filter(([key]) => !key.toLowerCase().includes("font") && key !== "radius")
            .map(([key, value]) => (
              <label key={key} className="text-[11px] font-bold text-dim">
                {key}
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-line p-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setTokens({ ...tokens, [key]: e.target.value })}
                    className="size-7"
                  />
                  <span className="price text-[10px]">{value}</span>
                </div>
              </label>
            ))}
        </div>
        <button className="mt-4 w-full rounded-xl bg-ink py-3 text-[13px] font-bold text-white">
          테마 저장
        </button>
        {message && <p className="mt-3 text-[12px] text-dim">{message}</p>}
      </form>
      <div className="space-y-3">
        {items.length === 0 && <Empty text="아직 저장된 테마가 없습니다." />}
        {items.map((theme) => (
          <article key={theme.id} className="rounded-2xl border border-line bg-paper p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold">{theme.name}</p>
                <p className="text-[11px] text-dim">
                  v{theme.version} · {theme.status}
                </p>
              </div>
              <button
                onClick={() => publish(theme.id)}
                className="rounded-full border border-line px-3 py-1.5 text-[11px] font-bold"
              >
                Publish
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              {Object.entries(theme.tokens)
                .filter(([, value]) => /^#[0-9a-f]{6}$/i.test(value))
                .map(([key, value]) => (
                  <span
                    key={key}
                    title={`${key}: ${value}`}
                    className="size-8 rounded-full border border-line"
                    style={{ background: value }}
                  />
                ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function SectionsPanel() {
  const [items, setItems] = useState<Section[]>([]);
  const [form, setForm] = useState({
    slot: "hero",
    title: "Seoul, This Week",
    headline: "Seoul, This Week",
    description: "서울에서 건너온 이번 주의 큐레이션",
    image: "",
    href: "/best",
    cta: "Shop the edit",
    sort: 0,
  });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/studio/sections");
    const data = await res.json();
    setItems(data.items ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/studio/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot: form.slot,
        title: form.title,
        sort: Number(form.sort),
        payload: {
          headline: form.headline,
          description: form.description,
          image: form.image,
          href: form.href,
          cta: form.cta,
        },
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "섹션 초안을 저장했습니다." : data.error);
    if (res.ok) await load();
  }

  async function update(id: number, patch: Record<string, unknown>) {
    const res = await fetch("/api/studio/sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setMessage(res.ok ? "섹션을 업데이트했습니다." : "업데이트 실패");
    await load();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={create} className="rounded-2xl border border-line bg-paper p-5">
        <p className="text-[15px] font-bold">홈 섹션 추가</p>
        <Field label="슬롯">
          <select
            value={form.slot}
            onChange={(e) => setForm({ ...form, slot: e.target.value })}
            className="control"
          >
            {["hero", "categories", "ranking", "timedeal", "look", "brand", "ugc"].map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </select>
        </Field>
        {(["title", "headline", "description", "image", "href", "cta"] as const).map((key) => (
          <Field key={key} label={key}>
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="control"
            />
          </Field>
        ))}
        <button className="mt-4 w-full rounded-xl bg-ink py-3 text-[13px] font-bold text-white">
          초안 저장
        </button>
        {message && <p className="mt-3 text-[12px] text-dim">{message}</p>}
      </form>
      <div className="space-y-3">
        {items.length === 0 && <Empty text="아직 Studio 홈 섹션이 없습니다. 기존 정적 홈이 표시됩니다." />}
        {items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-line bg-paper p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="price grid size-8 place-items-center rounded-full bg-fog text-[11px] font-bold">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{item.title}</p>
                <p className="text-[11px] text-dim">
                  {item.slot} · v{item.version} · {item.status}
                </p>
              </div>
              <button
                onClick={() => update(item.id, { sort: Math.max(0, item.sort - 1) })}
                className="rounded-lg border border-line px-2 py-1 text-[11px]"
              >
                ↑
              </button>
              <button
                onClick={() => update(item.id, { sort: item.sort + 1 })}
                className="rounded-lg border border-line px-2 py-1 text-[11px]"
              >
                ↓
              </button>
              <button
                onClick={() => update(item.id, { status: "published" })}
                className="rounded-lg bg-coral px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Publish
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block text-[11px] font-bold text-dim">
      {label}
      <div className="mt-1 [&_.control]:w-full [&_.control]:rounded-xl [&_.control]:border [&_.control]:border-line [&_.control]:px-3 [&_.control]:py-2.5 [&_.control]:text-[13px] [&_.control]:text-ink">
        {children}
      </div>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center text-[13px] text-dim">{text}</div>;
}
