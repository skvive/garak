"use client";

/**
 * 역직구 운영 콘솔 — 스펙 §3 (loyadbeta 패널과 동일 API 소비)
 * 파이프라인: 수집 → 컬렉션 → 리뉴얼/승인 → 게시 → 구매요청 → 발주 → 정산
 */
import { useCallback, useEffect, useMemo, useState } from "react";

type Dict = Record<string, unknown>;
type State = {
  suppliers: Dict[]; supplierProducts: Dict[]; collections: Dict[]; collectionItems: Dict[];
  drafts: Dict[]; listings: Dict[]; channels: Dict[]; channelListings: Dict[];
  purchaseRequests: Dict[]; sourcingOrders: Dict[]; settlements: Dict[]; audit: Dict[];
  fx: Record<string, number>;
};

const TABS = ["공급처", "소싱상품", "초안승인", "리스팅", "구매요청", "발주", "정산"] as const;

const SAMPLE_CSV = `order_ref,listing_ref,qty,paid_amount,currency,buyer_name,country,addr1,zip,phone
ORD-90001,CP-MOCK-REPLACE,1,25900,KRW,홍길동,KR,서울 강남구 1,06000,010-1111-2222`;

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api/hq${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

/** Wing 패턴: 엑셀(CSV) 다운로드 */
function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const badge = (v: string) => {
  const color: Record<string, string> = {
    ok: "bg-sage/15 text-sage", live: "bg-sage/15 text-sage", vetted: "bg-sage/15 text-sage",
    approved: "bg-sage/15 text-sage", delivered: "bg-sage/15 text-sage", confirmed: "bg-sage/15 text-sage",
    settled: "bg-sage/15 text-sage", closed: "bg-sage/15 text-sage", fulfilled: "bg-sage/15 text-sage",
    failed: "bg-coral/15 text-coral", rejected: "bg-coral/15 text-coral", gone: "bg-coral/15 text-coral",
    refund_delegated: "bg-coral/15 text-coral", as_delegated: "bg-coral/15 text-coral",
    stale: "bg-gold/20 text-gold", review: "bg-gold/20 text-gold", pending: "bg-gold/20 text-gold",
    queued: "bg-gold/20 text-gold", requested: "bg-gold/20 text-gold", sourcing: "bg-gold/20 text-gold",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${color[v] ?? "bg-fog text-dim"}`}>{v}</span>
  );
};

export function SourcingConsole() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("공급처");
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [prSel, setPrSel] = useState<number[]>([]);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{ title: string; html: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      setS((await api("/state")) as State);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "load failed");
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setMsg("");
    try {
      const r = await fn();
      setMsg(`✓ ${label}: ${JSON.stringify(r).slice(0, 180)}`);
      await reload();
    } catch (e) {
      setMsg(`✖ ${label}: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setBusy("");
    }
  };

  const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
  const str = (v: unknown) => String(v ?? "");

  const spById = useMemo(() => new Map((s?.supplierProducts ?? []).map((p) => [num(p.id), p])), [s]);
  const chById = useMemo(() => new Map((s?.channels ?? []).map((c) => [num(c.id), c])), [s]);
  const clById = useMemo(() => new Map((s?.channelListings ?? []).map((c) => [num(c.id), c])), [s]);

  if (!s) return <p className="py-10 text-center text-[13px] text-dim">콘솔 로딩 중… {msg}</p>;

  const th = "px-2 py-2 text-left text-[11px] font-bold text-dim whitespace-nowrap";
  const td = "px-2 py-2 text-[12px] align-top";
  const btn = "rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-40";
  const btnGhost = "rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-40";

  /* Wing 패턴 1: 퍼널 상태 카운터 카드 — 클릭 시 해당 단계 탭으로 이동 */
  const funnel: { label: string; count: number; tab: (typeof TABS)[number]; hot?: boolean }[] = [
    { label: "소싱상품", count: s.supplierProducts.length, tab: "소싱상품" },
    { label: "검토대기 초안", count: s.drafts.filter((d) => str(d.status) === "review").length, tab: "초안승인", hot: true },
    { label: "라이브 리스팅", count: s.channelListings.filter((c) => str(c.publishState) === "live").length, tab: "리스팅" },
    { label: "검수대기 주문", count: s.purchaseRequests.filter((p) => ["received", "matched"].includes(str(p.status))).length, tab: "구매요청", hot: true },
    { label: "발주 진행", count: s.sourcingOrders.filter((o) => !["settled", "cancelled", "failed"].includes(str(o.status))).length, tab: "발주" },
    { label: "정산 대기", count: s.settlements.filter((x) => str(x.status) === "pending").length, tab: "정산", hot: true },
  ];
  /* Wing 패턴 2: 온보딩 체크리스트 배너 */
  const nextStep =
    s.supplierProducts.length === 0 ? "① 공급처 탭에서 카탈로그를 수집하세요"
    : s.collectionItems.length === 0 ? "② 소싱상품을 컬렉션에 담으세요"
    : s.drafts.length === 0 ? "③ 초안승인 탭에서 AI 리뉴얼을 실행하세요"
    : s.listings.length === 0 ? "④ 초안을 승인해 리스팅을 만드세요"
    : s.channelListings.filter((c) => str(c.publishState) === "live").length === 0 ? "⑤ 리스팅을 채널에 게시하세요"
    : s.purchaseRequests.length === 0 ? "⑥ 구매요청 탭에서 쿠팡 주문을 가져오세요"
    : null;

  return (
    <div>
      {nextStep && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-[12px] font-semibold">
          <span aria-hidden>⚠️</span> 파이프라인 다음 단계: {nextStep}
        </div>
      )}
      <div className="mb-4 grid grid-cols-3 gap-2 md:grid-cols-6">
        {funnel.map((f) => (
          <button key={f.label} onClick={() => setTab(f.tab)}
            className={`rounded-xl border p-3 text-left transition-colors hover:bg-fog ${
              f.hot && f.count > 0 ? "border-coral/50 bg-coral/5" : "border-line"
            } ${tab === f.tab ? "ring-2 ring-ink" : ""}`}>
            <p className="text-[11px] font-medium text-dim">{f.label}</p>
            <p className={`price text-[22px] font-bold ${f.hot && f.count > 0 ? "text-coral" : ""}`}>{f.count}<span className="ml-0.5 text-[11px] font-medium text-dim">건</span></p>
          </button>
        ))}
      </div>
      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-fog p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${tab === t ? "bg-ink text-white" : "text-dim"}`}>
            {t}
          </button>
        ))}
      </div>
      {msg && <p className="mt-3 break-all rounded-lg bg-fog p-2.5 text-[11px] text-dim">{msg}</p>}

      {/* ── 공급처 ── */}
      {tab === "공급처" && (
        <div className="mt-4 space-y-3">
          {s.suppliers.map((sup) => (
            <div key={num(sup.id)} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">{str(sup.name)} <span className="text-[11px] font-normal text-dim">({str(sup.code)} · {str(sup.connectorKind)})</span></p>
                <p className="text-[11px] text-dim">리드타임 {num(sup.leadTimeDays)}일 · {str(sup.currency)} · {str(sup.legalNote)}</p>
              </div>
              {badge(str(sup.status))}
              <button className={btn} disabled={!!busy}
                onClick={() => run(`${str(sup.code)} sync`, () => api(`/suppliers/${str(sup.code)}/sync`, "POST", {}))}>
                {busy ? "…" : "카탈로그 수집"}
              </button>
              {str(sup.code) === "superbuy" && (
                <button className={btnGhost} disabled={!!busy}
                  onClick={() => {
                    const url = prompt("타오바오/1688 상품 URL");
                    if (url) void run("URL 임포트", () => api(`/suppliers/superbuy/sync`, "POST", { url }));
                  }}>URL 임포트</button>
              )}
            </div>
          ))}
          <p className="text-[11px] text-dim">수집 상품 {s.supplierProducts.length}건 · API 키 미설정 공급처는 목업 픽스처로 동작</p>
        </div>
      )}

      {/* ── 소싱상품 ── */}
      {tab === "소싱상품" && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-dim">{selected.length}개 선택</span>
            <button className={btn} disabled={selected.length === 0 || !!busy}
              onClick={() => run("컬렉션 담기", async () => {
                const r = await api("/collections/items", "POST", { collectionId: num(s.collections[0]?.id), supplierProductIds: selected });
                setSelected([]);
                return r;
              })}>
              ★ {str(s.collections[0]?.name)}에 담기
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full">
              <thead className="bg-fog"><tr>
                <th className={th}></th><th className={th}>상품</th><th className={th}>카테고리</th>
                <th className={th}>원가</th><th className={th}>재고</th><th className={th}>판매자</th><th className={th}>상태</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {s.supplierProducts.map((p) => (
                  <tr key={num(p.id)}>
                    <td className={td}>
                      <input type="checkbox" checked={selected.includes(num(p.id))}
                        onChange={(e) => setSelected((cur) => e.target.checked ? [...cur, num(p.id)] : cur.filter((x) => x !== num(p.id)))} />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        {Array.isArray(p.images) && (p.images as { url: string }[])[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={(p.images as { url: string }[])[0].url} alt="" className="size-9 rounded-md object-cover" />
                        )}
                        <span className="max-w-56 truncate font-medium">{str(p.rawTitle)}</span>
                      </div>
                    </td>
                    <td className={td}>{(p.rawCategoryPath as string[])?.join(" › ")}</td>
                    <td className={`${td} price`}>{str(p.currency)} {num(p.priceOriginal)}</td>
                    <td className={`${td} price`}>{num(p.stock)}</td>
                    <td className={td}>{str(p.sellerName)}</td>
                    <td className={td}>{badge(str(p.syncStatus))}</td>
                  </tr>
                ))}
                {s.supplierProducts.length === 0 && (
                  <tr><td className={`${td} text-dim`} colSpan={7}>공급처 탭에서 카탈로그 수집을 먼저 실행하세요.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 초안승인 ── */}
      {tab === "초안승인" && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-fog p-3">
            <p className="flex-1 text-[12px] text-dim">
              컬렉션 <b>{str(s.collections[0]?.name)}</b> — 후보 {s.collectionItems.filter((i) => str(i.decision) === "candidate").length} ·
              승인 {s.collectionItems.filter((i) => str(i.decision) === "approved").length}
            </p>
            <button className={btnGhost} disabled={!!busy}
              onClick={() => run("후보 전체 소싱승인", async () => {
                const items = s.collectionItems.filter((i) => str(i.decision) === "candidate");
                for (const i of items) await api("/collections/items", "PATCH", { itemId: num(i.id), decision: "approved" });
                return { approved: items.length };
              })}>후보 전체 승인</button>
            <button className={btn} disabled={!!busy}
              onClick={() => run("AI 리뉴얼 생성", () => api("/drafts", "POST", { collectionId: num(s.collections[0]?.id) }))}>
              ✨ AI 리뉴얼 초안 생성
            </button>
          </div>
          {s.drafts.map((d) => {
            const sp = spById.get(num(d.supplierProductId));
            return (
              <div key={num(d.id)} className="rounded-xl border border-line p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-bold">#{num(d.id)} {str(d.title)}</p>
                  {badge(str(d.status))}
                </div>
                <p className="mt-1 text-[11px] text-dim">{str(d.subtitle)} · 원본: {str(sp?.rawTitle)} · {str(d.aiModel)} v{num(d.version)}</p>
                {str(d.status) === "review" && (
                  <div className="mt-2 flex gap-2">
                    <button className={btnGhost} disabled={!!busy}
                      onClick={() => run("미리보기", async () => {
                        const full = (await api(`/drafts?id=${num(d.id)}`)) as { title: string; renderedHtml: string };
                        setPreview({ title: full.title, html: full.renderedHtml });
                        return { ok: 1 };
                      })}>미리보기</button>
                    <button className={btn} disabled={!!busy}
                      onClick={() => run(`초안 #${num(d.id)} 승인`, () => api(`/drafts/${num(d.id)}`, "PATCH", { decision: "approved", marginPolicy: { type: "rate", value: 0.35, minMarginUsd: 3 } }))}>
                      승인 → 리스팅 생성 (마진 35%)
                    </button>
                    <button className={btnGhost} disabled={!!busy}
                      onClick={() => run("반려", () => api(`/drafts/${num(d.id)}`, "PATCH", { decision: "rejected" }))}>반려</button>
                  </div>
                )}
              </div>
            );
          })}
          {s.drafts.length === 0 && <p className="text-[12px] text-dim">초안 없음 — 소싱상품을 컬렉션에 담고 리뉴얼을 실행하세요.</p>}
        </div>
      )}

      {/* ── 리스팅 ── */}
      {tab === "리스팅" && (
        <div className="mt-4 space-y-3">
          {s.listings.map((l) => {
            const draft = s.drafts.find((d) => num(d.id) === num(l.draftId));
            const cls = s.channelListings.filter((c) => num(c.listingId) === num(l.id));
            return (
              <div key={num(l.id)} className="rounded-xl border border-line p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-bold">#{num(l.id)} {str(draft?.title)}</p>
                  {badge(str(l.status))}
                  <span className="price text-[13px] font-bold">원가 ${num(l.supplierCostUsd)} → 판매가 ${num(l.sellPriceUsd)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {["lexi", "coupang"].map((code) => (
                    <button key={code} className={btn} disabled={!!busy}
                      onClick={() => run(`${code} 게시`, () => api(`/listings/${num(l.id)}/publish`, "POST", { channels: [code] }))}>
                      {code}에 게시
                    </button>
                  ))}
                  {cls.map((c) => (
                    <span key={num(c.id)} className="flex items-center gap-1 text-[11px] text-dim">
                      {str((chById.get(num(c.channelId)) as Dict | undefined)?.code)}: {badge(str(c.publishState))} {str(c.externalRef)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {s.listings.length === 0 && <p className="text-[12px] text-dim">리스팅 없음 — 초안을 승인하면 생성됩니다.</p>}
        </div>
      )}

      {/* ── 구매요청 ── */}
      {tab === "구매요청" && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-fog p-3">
            <button className={btn} disabled={!!busy}
              onClick={() => run("쿠팡 주문 pull", () => api("/channels/coupang/pull-orders", "POST", {}))}>
              쿠팡 주문 가져오기 (API/목업)
            </button>
            <span className="text-[11px] text-dim">또는 엑셀(CSV) 붙여넣기:</span>
            <button className={btnGhost} onClick={() => {
              const liveRef = s.channelListings.find((c) => str(c.publishState) === "live")?.externalRef;
              setCsv(SAMPLE_CSV.replace("CP-MOCK-REPLACE", str(liveRef ?? "CP-MOCK-0")));
            }}>샘플 채우기</button>
            <button className={btn} disabled={!csv || !!busy}
              onClick={() => run("CSV 인입", () => api("/purchase-requests/import", "POST", { channelCode: "coupang", filename: "manual.csv", csv }))}>
              인입 실행
            </button>
          </div>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={3}
            placeholder="order_ref,listing_ref,qty,paid_amount,currency,buyer_name,country,addr1,zip,phone"
            className="w-full rounded-xl border border-line p-2.5 font-mono text-[11px]" />
          {/* Wing 패턴 3: N개 선택됨 → 일괄 상태전이 + 엑셀 다운로드 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-dim">{prSel.length}개 선택됨</span>
            <button className={btn} disabled={prSel.length === 0 || !!busy}
              onClick={() => run(`일괄 검수 (${prSel.length}건)`, async () => {
                let ok = 0;
                for (const id of prSel) {
                  const pr = s.purchaseRequests.find((p) => num(p.id) === id);
                  if (pr && ["received", "matched"].includes(str(pr.status))) {
                    await api(`/purchase-requests/${id}`, "PATCH", { action: "vet" });
                    ok++;
                  }
                }
                setPrSel([]);
                return { vetted: ok };
              })}>일괄 검수✓</button>
            <button className={btnGhost} disabled={prSel.length === 0 || !!busy}
              onClick={() => run(`일괄 반려 (${prSel.length}건)`, async () => {
                for (const id of prSel) await api(`/purchase-requests/${id}`, "PATCH", { action: "reject", reason: "일괄 반려" }).catch(() => null);
                setPrSel([]);
                return { done: 1 };
              })}>일괄 반려</button>
            <button className={btnGhost}
              onClick={() => downloadCsv("purchase-requests.csv", s.purchaseRequests.map((p) => ({
                id: num(p.id), order_ref: str(p.externalOrderRef),
                channel: str((chById.get(num(p.channelId)) as Dict | undefined)?.code),
                buyer: str(p.buyerName), country: str(p.buyerCountry), qty: num(p.qty),
                paid: num(p.channelPaidAmount), currency: str(p.channelCurrency), status: str(p.status),
              })))}>⬇ 엑셀 다운로드</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full">
              <thead className="bg-fog"><tr>
                <th className={th}>
                  <input type="checkbox"
                    checked={prSel.length > 0 && prSel.length === s.purchaseRequests.filter((p) => ["received", "matched"].includes(str(p.status))).length}
                    onChange={(e) => setPrSel(e.target.checked
                      ? s.purchaseRequests.filter((p) => ["received", "matched"].includes(str(p.status))).map((p) => num(p.id))
                      : [])} />
                </th>
                <th className={th}>주문</th><th className={th}>채널</th><th className={th}>구매자</th>
                <th className={th}>금액</th><th className={th}>상태</th><th className={th}>액션</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {s.purchaseRequests.map((p) => (
                  <tr key={num(p.id)}>
                    <td className={td}>
                      {["received", "matched"].includes(str(p.status)) && (
                        <input type="checkbox" checked={prSel.includes(num(p.id))}
                          onChange={(e) => setPrSel((cur) => e.target.checked ? [...cur, num(p.id)] : cur.filter((x) => x !== num(p.id)))} />
                      )}
                    </td>
                    <td className={td}>#{num(p.id)} {str(p.externalOrderRef)}</td>
                    <td className={td}>{str((chById.get(num(p.channelId)) as Dict | undefined)?.code)}</td>
                    <td className={td}>{str(p.buyerName)} ({str(p.buyerCountry)})</td>
                    <td className={`${td} price`}>{str(p.channelCurrency)} {num(p.channelPaidAmount).toLocaleString()} ×{num(p.qty)}</td>
                    <td className={td}>{badge(str(p.status))}</td>
                    <td className={td}>
                      <div className="flex gap-1.5">
                        {(str(p.status) === "received" || str(p.status) === "matched") && (
                          <>
                            <button className={btn} disabled={!!busy}
                              onClick={() => run("검수 승인", () => api(`/purchase-requests/${num(p.id)}`, "PATCH", { action: "vet" }))}>검수✓</button>
                            <button className={btnGhost} disabled={!!busy}
                              onClick={() => run("반려", () => api(`/purchase-requests/${num(p.id)}`, "PATCH", { action: "reject", reason: "관리자 반려" }))}>반려</button>
                          </>
                        )}
                        {str(p.status) === "vetted" && (
                          <button className={btn} disabled={!!busy}
                            onClick={() => run("발주", () => api("/sourcing-orders", "POST", { purchaseRequestId: num(p.id) }))}>공급처 발주 →</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {s.purchaseRequests.length === 0 && <tr><td className={`${td} text-dim`} colSpan={7}>인입된 구매요청 없음</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 발주 ── */}
      {tab === "발주" && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead className="bg-fog"><tr>
              <th className={th}>발주</th><th className={th}>공급처ref</th><th className={th}>원가</th>
              <th className={th}>트래킹</th><th className={th}>상태</th><th className={th}>전이</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {s.sourcingOrders.map((o) => (
                <tr key={num(o.id)}>
                  <td className={td}>#{num(o.id)} (PR#{num(o.purchaseRequestId)})</td>
                  <td className={td}>{str(o.supplierOrderRef) || "—"}</td>
                  <td className={`${td} price`}>${num(o.costUsd)} + 배송 ${num(o.shippingUsd)}</td>
                  <td className={td}>{str(o.trackingNo) || "—"} {str(o.carrier)}</td>
                  <td className={td}>{badge(str(o.status))}</td>
                  <td className={td}>
                    <div className="flex gap-1.5">
                      {({ requested: ["confirmed"], confirmed: ["shipped", "as_delegated"], shipped: ["delivered", "as_delegated"], delivered: [] } as Record<string, string[]>)[str(o.status)]?.map((to) => (
                        <button key={to} className={to === "as_delegated" ? btnGhost : btn} disabled={!!busy}
                          onClick={() => run(`→${to}`, () => api(`/sourcing-orders/${num(o.id)}`, "PATCH", to === "shipped" ? { to, trackingNo: `TRK${num(o.id)}`, carrier: "CJPacket" } : to === "as_delegated" ? { to, asTicketRef: `AS-${num(o.id)}` } : { to }))}>
                          {to === "as_delegated" ? "AS이관" : to}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {s.sourcingOrders.length === 0 && <tr><td className={`${td} text-dim`} colSpan={6}>발주 없음 — 구매요청 검수 후 발주하세요.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 정산 ── */}
      {tab === "정산" && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <button className={btnGhost}
              onClick={() => downloadCsv("settlements.csv", s.settlements.map((x) => ({
                id: num(x.id), sourcing_order: num(x.sourcingOrderId),
                revenue_usd: num(x.revenueUsd), cost_usd: num(x.costUsd), shipping_usd: num(x.shippingUsd),
                channel_fee_usd: num(x.channelFeeUsd), pg_fee_usd: num(x.pgFeeUsd),
                margin_usd: num(x.marginUsd), fx_rate: num(x.fxRate), status: str(x.status),
              })))}>⬇ 정산관리 엑셀 다운로드</button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(() => {
              const sum = (k: string) => s.settlements.reduce((a, x) => a + num(x[k]), 0);
              return [
                ["매출(USD)", sum("revenueUsd")], ["원가+배송", sum("costUsd") + sum("shippingUsd")],
                ["수수료", sum("channelFeeUsd") + sum("pgFeeUsd")], ["마진", sum("marginUsd")],
              ].map(([label, v]) => (
                <div key={String(label)} className="rounded-xl border border-line p-3.5">
                  <p className="text-[11px] text-dim">{String(label)}</p>
                  <p className={`price text-[20px] font-bold ${label === "마진" ? "text-sage" : ""}`}>${(v as number).toFixed(2)}</p>
                </div>
              ));
            })()}
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full">
              <thead className="bg-fog"><tr>
                <th className={th}>정산</th><th className={th}>매출</th><th className={th}>원가</th>
                <th className={th}>수수료</th><th className={th}>마진</th><th className={th}>상태</th><th className={th}></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {s.settlements.map((x) => (
                  <tr key={num(x.id)}>
                    <td className={td}>#{num(x.id)} (SO#{num(x.sourcingOrderId)})</td>
                    <td className={`${td} price`}>${num(x.revenueUsd)}</td>
                    <td className={`${td} price`}>${(num(x.costUsd) + num(x.shippingUsd)).toFixed(2)}</td>
                    <td className={`${td} price`}>${(num(x.channelFeeUsd) + num(x.pgFeeUsd)).toFixed(2)}</td>
                    <td className={`${td} price font-bold ${num(x.marginUsd) >= 0 ? "text-sage" : "text-coral"}`}>${num(x.marginUsd)}</td>
                    <td className={td}>{badge(str(x.status))}</td>
                    <td className={td}>
                      {str(x.status) === "pending" && (
                        <button className={btn} disabled={!!busy}
                          onClick={() => run("정산 확정", () => api(`/settlements/${num(x.id)}`, "PATCH", { action: "confirm" }))}>확정</button>
                      )}
                    </td>
                  </tr>
                ))}
                {s.settlements.length === 0 && <tr><td className={`${td} text-dim`} colSpan={7}>정산 없음 — 발주를 delivered로 전이하면 자동 생성됩니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog">
          <button aria-label="닫기" className="absolute inset-0 bg-ink/50" onClick={() => setPreview(null)} />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold">{preview.title}</h3>
              <button className={btnGhost} onClick={() => setPreview(null)}>닫기</button>
            </div>
            <iframe title="상세 미리보기" srcDoc={preview.html} className="h-[60vh] w-full rounded-xl border border-line" />
          </div>
        </div>
      )}
    </div>
  );
}
