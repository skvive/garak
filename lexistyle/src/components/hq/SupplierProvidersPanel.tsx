"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { SOURCING_PLATFORMS, type SourcingPlatformCode } from "@/lib/sourcing/platforms";

type Provider = {
  id: string;
  platformCode: string;
  companyName: string;
  phone: string | null;
  email: string | null;
  homepage: string | null;
  productCount: number;
  thumbUrl: string | null;
  warehouse: string | null;
};

type PlatformMeta = (typeof SOURCING_PLATFORMS)[number];

function dash(v: string | null | undefined) {
  return v && v.trim() ? v : "—";
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text.slice(0, 160) || `HTTP ${res.status}`);
  }
}

export function SupplierProvidersPanel() {
  const [platform, setPlatform] = useState<SourcingPlatformCode>("cjdropshipping");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [meta, setMeta] = useState<PlatformMeta>(SOURCING_PLATFORMS[0]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async (code: SourcingPlatformCode) => {
    setBusy("load");
    setMsg("");
    try {
      const res = await fetch(`/api/hq/suppliers/providers?platform=${code}`);
      const json = await readJson(res);
      if (!res.ok) throw new Error(String(json.error ?? `HTTP ${res.status}`));
      setProviders((json.providers as Provider[]) ?? []);
      setMeta((json.platform as PlatformMeta) ?? SOURCING_PLATFORMS[0]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
      setProviders([]);
    } finally {
      setBusy("");
    }
  }, []);

  const refresh = useCallback(async () => {
    setBusy("refresh");
    setMsg("");
    try {
      const res = await fetch("/api/hq/suppliers/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(String(json.error ?? `HTTP ${res.status}`));
      setProviders((json.providers as Provider[]) ?? []);
      setMeta((json.platform as PlatformMeta) ?? SOURCING_PLATFORMS[0]);
      setMsg(`셀러 메타 갱신 ${json.updated ?? 0}건 · 스캔 ${json.scanned ?? 0}건`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy("");
    }
  }, [platform]);

  useEffect(() => {
    void load(platform);
  }, [load, platform]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return providers;
    return providers.filter((p) => p.companyName.toLowerCase().includes(needle));
  }, [providers, q]);

  const btnGhost = "rounded-lg border border-line px-3 py-2 text-[12px] font-bold disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-balance text-[24px] font-semibold">
            공급처
          </h1>
          <p className="mt-1 text-[13px] leading-[1.6] text-dim">
            상품페이지를 공급하는 실제 프로바이더 · 기본 플랫폼 CJ 드랍쉬핑
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          {meta.connected && (
            <button type="button" disabled={!!busy} className={btnGhost} onClick={() => void refresh()}>
              셀러 정보 갱신
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 overflow-hidden rounded-lg border border-line" role="group" aria-label="소싱 플랫폼">
        {SOURCING_PLATFORMS.map((p) => (
          <button
            key={p.code}
            type="button"
            aria-pressed={platform === p.code}
            className={`px-4 py-2 text-[13px] font-bold transition-colors ${
              platform === p.code ? "bg-ink text-white" : "bg-paper text-dim hover:bg-fog"
            }`}
            onClick={() => setPlatform(p.code)}
          >
            {p.label}
            {!p.connected && <span className="ml-1.5 text-[11px] font-medium opacity-70">미연동</span>}
          </button>
        ))}
      </div>

      <p className="text-[13px] leading-[1.6] text-dim">
        {meta.note}
        {meta.homepage && (
          <>
            {" · "}
            <a href={meta.homepage} target="_blank" rel="noreferrer" className="text-ink underline">
              {meta.homepage.replace(/^https?:\/\//, "")}
            </a>
          </>
        )}
        {meta.email && ` · ${meta.email}`}
      </p>

      {meta.connected && (
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-[13px] leading-[1.6]"
            placeholder="회사명 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {msg && <p className="rounded-lg bg-fog px-3 py-2 text-[12px] leading-[1.6] text-dim">{msg}</p>}
      {busy && <p className="text-[12px] text-dim">처리 중: {busy}…</p>}

      {!meta.connected && (
        <div className="rounded-2xl border border-line bg-paper px-5 py-10 text-center">
          <p className="text-[15px] font-bold">슈퍼바이는 아직 연동되지 않았습니다</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-dim">
            1688·타오바오 상품은 Superbuy 대리구매 API가 붙은 뒤 이 탭에 셀러 목록이 채워집니다. 지금은 CJ 드랍쉬핑만
            카탈로그 프로바이더를 집계합니다.
          </p>
        </div>
      )}

      {meta.connected && viewMode === "list" && (
        <div className="max-h-[560px] overflow-auto rounded-2xl border border-line bg-paper">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-fog text-[12px] text-dim">
              <tr>
                <th className="p-3 font-bold">회사명</th>
                <th className="p-3 font-bold">전화번호</th>
                <th className="p-3 font-bold">이메일</th>
                <th className="p-3 font-bold">홈페이지</th>
                <th className="p-3 font-bold">상품</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-line text-[13px] leading-[1.6]">
                  <td className="p-3 font-medium">
                    {p.companyName}
                    {p.warehouse && <span className="mt-0.5 block text-[11px] text-dim">창고 {p.warehouse}</span>}
                  </td>
                  <td className="p-3">{dash(p.phone)}</td>
                  <td className="p-3 break-all">{dash(p.email)}</td>
                  <td className="p-3">
                    {p.homepage ? (
                      <a href={p.homepage} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                        {p.homepage.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 tabular-nums">{p.productCount}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[13px] text-dim">
                    카탈로그에 셀러가 없습니다. 「셀러 정보 갱신」으로 CJ 목록에서 공장명을 가져오세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {meta.connected && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="aspect-[16/9] bg-fog">
                {p.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[12px] text-dim">이미지 없음</div>
                )}
              </div>
              <div className="p-3 text-[13px] leading-[1.6]">
                <p className="font-bold">{p.companyName}</p>
                <p className="mt-1 text-dim">전화 {dash(p.phone)}</p>
                <p className="text-dim">이메일 {dash(p.email)}</p>
                <p className="text-dim">
                  홈페이지{" "}
                  {p.homepage ? (
                    <a href={p.homepage} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                      링크
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mt-2 text-[12px] font-bold tabular-nums">상품 {p.productCount}건</p>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <p className="col-span-full p-8 text-center text-[13px] text-dim">
              카탈로그에 셀러가 없습니다. 「셀러 정보 갱신」으로 CJ 목록에서 공장명을 가져오세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
