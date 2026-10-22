"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PUBLIC_PLANS } from "@/lib/shorts/pricing";
import type { ShortProduct, ShortScript } from "@/lib/shorts/script";
import { ScenePreview } from "./scene-preview";

type Plan = { label: string; priceUsd: number; monthlyCredits: number; watermark: boolean };
type Account = { signedIn: boolean; plan?: string; credits?: number; plans: Record<string, Plan> };
type JobLite = { id: number; status: string; progress: number; template: string; script: ShortScript; createdAt: string };

const STATUS_KO: Record<string, string> = { queued: "대기", rendering: "렌더링", uploading: "업로드", completed: "완료", failed: "실패" };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function ShortsStudio() {
  const params = useParams();
  const lng = typeof params.lng === "string" ? params.lng : "ko";
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState({ title: "", price: "", images: "", features: "" });
  const [busy, setBusy] = useState<"" | "extract" | "scripts" | "job" | "upload">("");
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ShortProduct | null>(null);
  const [scripts, setScripts] = useState<ShortScript[]>([]);
  const [pick, setPick] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [jobs, setJobs] = useState<JobLite[]>([]);

  useEffect(() => {
    fetch("/api/shorts/account").then((r) => r.json()).then((a: Account) => {
      setAccount(a);
      if (a.signedIn) fetch("/api/shorts/jobs").then((r) => r.json()).then((d) => setJobs(d.jobs ?? []));
    }).catch(() => setAccount({ signedIn: false, plans: {} }));
  }, []);

  function loaded(d: { product: ShortProduct; scripts: ShortScript[] }) {
    setProduct(d.product);
    setScripts(d.scripts);
    setPick(0);
    setDraft({
      title: d.product.title,
      price: d.product.priceAmount ? String(d.product.priceAmount) : "",
      images: d.product.imageUrls.join("\n"),
      features: d.product.features.join("\n"),
    });
  }

  async function extract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("extract");
    try {
      loaded(await post("/api/shorts/extract", { url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "추출 실패");
      setManual(true);
    } finally {
      setBusy("");
    }
  }

  async function rebuild() {
    setError("");
    setBusy("scripts");
    try {
      loaded(
        await post("/api/shorts/scripts", {
          product: {
            ...(product ?? { currency: "KRW", reviews: [] }),
            sourceUrl: product?.sourceUrl ?? url,
            title: draft.title,
            priceAmount: draft.price,
            imageUrls: lines(draft.images),
            features: lines(draft.features),
          },
        }),
      );
      setManual(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "대본 생성 실패");
    } finally {
      setBusy("");
    }
  }

  async function upload(file: File) {
    setError("");
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/shorts/upload", { method: "POST", body: fd });
      const d = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !d.url) throw new Error(d.error ?? "업로드 실패");
      setDraft((x) => ({ ...x, images: [x.images, d.url].filter(Boolean).join("\n") }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setBusy("");
    }
  }

  async function createVideo() {
    if (!product || !scripts[pick]) return;
    setError("");
    setBusy("job");
    try {
      const d = await post<{ job: { id: number } }>("/api/shorts/jobs", { product, script: scripts[pick] });
      router.push(`/${lng}/shorts/jobs/${d.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "영상 생성 실패");
      setBusy("");
    }
  }

  const script = scripts[pick];
  const signedIn = account?.signedIn;
  const credits = account?.credits ?? 0;

  return (
    <div className="leading-relaxed">
      <section className="border-b border-line bg-fog">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="mb-3 text-sm font-semibold text-coral">URL에서 숏폼까지</p>
          <h1 className="mb-4 max-w-2xl text-3xl font-bold md:text-4xl" style={{ textWrap: "balance" }}>
            상품 주소만 넣으면 대본 3종이 먼저 열리고, 영상은 그다음입니다
          </h1>
          <p className="mb-8 max-w-xl text-sm text-dim">
            스마트스토어, 쿠팡, Cafe24, Shopify. 상품 정보와 후킹 문구, 9:16 미리보기는 로그인 없이 무료입니다. 파일로 받는 단계에서만 크레딧을 씁니다.
          </p>
          <ol className="mb-8 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "주소", "공개 상품 페이지에서 이름, 가격, 이미지를 읽습니다."],
              ["02", "대본", "리뷰, 세일, 감성 세 가지를 바로 비교합니다."],
              ["03", "받기", "15초 영상을 만든 뒤, 다운로드에서 플랜을 고릅니다."],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl border border-line bg-paper p-4">
                <p className="text-xs font-semibold text-dim">{n}</p>
                <p className="font-bold">{t}</p>
                <p className="text-sm text-dim">{d}</p>
              </li>
            ))}
          </ol>

      <form onSubmit={extract} className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://smartstore.naver.com/..."
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
        />
        <button disabled={busy !== ""} className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy === "extract" ? "읽는 중…" : "상품 불러오기"}
        </button>
      </form>
      <button type="button" onClick={() => setManual((v) => !v)} className="text-sm text-dim underline">
        {manual ? "직접 입력 닫기" : "주소가 안 열리면 직접 입력"}
      </button>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 py-10">

      {error ? <p className="mb-6 rounded-xl bg-fog px-4 py-3 text-sm text-sale">{error}</p> : null}

      {manual || product ? (
        <section className="mb-8 rounded-2xl border border-line p-5">
          <h2 className="mb-4 text-lg font-bold">상품 정보</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              상품명
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="text-sm">
              판매가
              <input inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="text-sm">
              이미지 URL (한 줄에 하나, https)
              <textarea rows={4} value={draft.images} onChange={(e) => setDraft({ ...draft, images: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 text-xs" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            <label className="text-sm">
              핵심 특징 (한 줄에 하나)
              <textarea rows={4} value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
          </div>
          <button type="button" onClick={rebuild} disabled={busy !== ""} className="mt-4 rounded-xl border border-ink px-5 py-2 text-sm font-semibold disabled:opacity-50">
            {busy === "scripts" ? "만드는 중…" : busy === "upload" ? "업로드 중…" : product ? "수정 내용으로 대본 다시 만들기" : "대본 만들기"}
          </button>
        </section>
      ) : null}

      {product && script ? (
        <section className="mb-10 grid gap-6 md:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {scripts.map((s, i) => (
                <button
                  key={s.template}
                  type="button"
                  onClick={() => setPick(i)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${i === pick ? "bg-ink text-white" : "bg-fog text-ink"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mb-3 text-sm">
              <span className="font-semibold">후킹 문구</span> {script.hookText}
            </p>
            <ol className="space-y-2">
              {script.scenes.map((sc) => (
                <li key={sc.sceneId} className="rounded-xl bg-fog px-4 py-3 text-sm">
                  <div className="mb-1 flex items-center justify-between text-xs text-dim">
                    <span>씬 {sc.sceneId} · {sc.duration}초</span>
                    <span>{sc.visual === "wan_i2v" ? "AI 모션" : "줌 모션"}</span>
                  </div>
                  <p className="font-semibold">{sc.overlayText}</p>
                  <p className="text-dim">{sc.narration}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <ScenePreview script={script} images={product.imageUrls} />
            <div className="mt-4">
              <p className="mb-2 text-center text-xs text-dim">미리보기는 무료. 영상 만들기만 1편을 씁니다.</p>
              {!signedIn ? (
                <Link href={`/auth/sign-in?next=/${lng}/shorts`} className="block rounded-xl bg-coral py-4 text-center text-sm font-semibold text-white">
                  로그인하고 영상 받기 (무료 2편)
                </Link>
              ) : (
                <button type="button" onClick={createVideo} disabled={busy !== "" || credits < 1} className="w-full rounded-xl bg-coral py-4 text-sm font-semibold text-white disabled:opacity-50">
                  {busy === "job" ? "요청 중…" : credits < 1 ? "크레딧이 없습니다" : `영상 만들기 · 크레딧 1 (잔여 ${credits})`}
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {jobs.length ? (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">내 영상</h2>
            <Link href={`/${lng}/shorts/dashboard`} className="text-sm text-dim underline">대시보드</Link>
          </div>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/${lng}/shorts/jobs/${j.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="truncate">{j.script?.label ?? j.template} · {j.script?.hookText}</span>
                  <span className={j.status === "failed" ? "text-sale" : j.status === "completed" ? "text-fresh" : "text-dim"}>
                    {STATUS_KO[j.status] ?? j.status} {j.status !== "completed" && j.status !== "failed" ? `${j.progress}%` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="plans">
        <h2 className="mb-1 text-lg font-bold">요금제</h2>
        <p className="mb-4 text-sm text-dim">
          {signedIn ? `현재 ${account?.plans?.[account.plan ?? "free"]?.label ?? "Free"} 플랜 · 잔여 ${credits}편` : "가입하면 워터마크가 있는 영상 2편을 만들 수 있습니다."}{" "}
          워터마크 없는 원본은 Pro부터입니다. 결제는 준비 중이고, 지금은 플랜 안내만 드립니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(account?.plans && Object.keys(account.plans).length ? account.plans : PUBLIC_PLANS).map(([k, p]) => (
            <div key={k} className={`rounded-2xl border p-4 ${account?.plan === k ? "border-ink" : "border-line"}`}>
              <p className="font-bold">{p.label}</p>
              <p className="mb-2 text-2xl font-bold">{p.priceUsd ? `$${p.priceUsd}` : "무료"}<span className="text-xs font-normal text-dim">{p.priceUsd ? " /월" : ""}</span></p>
              <p className="text-sm text-dim">{k === "free" ? "가입 시 2편" : `월 ${p.monthlyCredits}편`}</p>
              <p className="text-sm text-dim">{p.watermark ? "워터마크 포함" : "워터마크 없음"}</p>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
