"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Plan = { label: string; priceUsd: number; monthlyCredits: number; watermark: boolean };
type Account = { signedIn: boolean; plan?: string; credits?: number; plans: Record<string, Plan> };
type Job = { id: number; status: string; progress: number; createdAt: string; script: { label: string; hookText: string } };

const STATUS: Record<string, string> = { queued: "대기", rendering: "렌더링", uploading: "업로드", completed: "완료", failed: "실패" };

export function Dashboard() {
  const params = useParams();
  const lng = typeof params.lng === "string" ? params.lng : "ko";
  const [account, setAccount] = useState<Account | null>(null);
  const [slow, setSlow] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetch("/api/shorts/account")
      .then((r) => r.json())
      .then(async (a: Account) => {
        setAccount(a);
        if (a.signedIn) {
          const d = await fetch("/api/shorts/jobs").then((r) => r.json());
          setJobs(d.jobs ?? []);
        }
      })
      .catch(() => setAccount({ signedIn: false, plans: {} }));
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!account) {
    return (
      <p className="mx-auto max-w-5xl px-4 py-10 text-sm text-dim">
        {slow ? "계정 정보를 아직 받지 못했습니다. 새로고침해 주세요." : "불러오는 중…"}
      </p>
    );
  }

  if (!account.signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold" style={{ textWrap: "balance" }}>만든 영상과 남은 편수는 로그인 후 보입니다</h1>
        <p className="mb-6 text-sm text-dim">대본 미리보기는 주소만으로 바로 볼 수 있습니다. 대시보드는 내 영상과 잔여 크레딧을 모읍니다.</p>
        <Link href={`/auth/sign-in?next=/${lng}/shorts/dashboard`} className="inline-block rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white">로그인</Link>
      </div>
    );
  }

  const plan = account.plans[account.plan ?? "free"];
  const cap = plan?.monthlyCredits ?? 2;
  const left = account.credits ?? 0;
  const used = Math.max(0, cap - left);
  const done = jobs.filter((j) => j.status === "completed").length;
  const running = jobs.filter((j) => j.status !== "completed" && j.status !== "failed").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold" style={{ textWrap: "balance" }}>대시보드</h1>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-dim">남은 영상</p>
          <p className="text-3xl font-bold tabular-nums">{left}<span className="text-base font-normal text-dim"> / {cap}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-fog">
            <div className="h-full bg-coral" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-dim">{plan?.label} · {used}편 사용</p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-dim">완성</p>
          <p className="text-3xl font-bold tabular-nums">{done}</p>
          <p className="mt-2 text-xs text-dim">진행 중 {running}편</p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-dim">다운로드</p>
          <p className="text-lg font-bold">{plan?.watermark ? "워터마크 포함" : "워터마크 없음"}</p>
          <p className="mt-2 text-xs text-dim">{plan?.watermark ? "원본 파일은 Pro에서 받습니다." : "만든 영상을 바로 받을 수 있습니다."}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">최근 영상</h2>
        <Link href={`/${lng}/shorts`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">새 영상</Link>
      </div>
      {jobs.length === 0 ? (
        <p className="rounded-2xl bg-fog px-4 py-8 text-center text-sm text-dim">아직 만든 영상이 없습니다. 상품 주소를 넣으면 대본부터 무료로 볼 수 있습니다.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/${lng}/shorts/jobs/${j.id}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{j.script?.hookText}</span>
                  <span className="text-dim">{j.script?.label} · {new Date(j.createdAt).toLocaleString("ko-KR")}</span>
                </span>
                <span className={j.status === "failed" ? "text-sale" : j.status === "completed" ? "text-fresh" : "text-dim"}>
                  {STATUS[j.status] ?? j.status}{j.status !== "completed" && j.status !== "failed" ? ` ${j.progress}%` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
