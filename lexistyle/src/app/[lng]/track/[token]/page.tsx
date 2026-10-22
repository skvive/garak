import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { CopyTrackingButton } from "@/components/track/CopyTrackingButton";
import { getState } from "@/lib/hq/store";
import { buildPublicTrackView, TRACK_STAGES } from "@/lib/hq/track-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "배송 추적", robots: { index: false, follow: false } };

export default async function PublicTrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = buildPublicTrackView(await getState(), token);
  if (!view) notFound();
  const current = view.stageIndex;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8" style={{ wordBreak: "keep-all" }}>
      <p className="text-[12px] font-semibold text-dim">LEXI 배송 추적</p>
      <h1 className="mt-1 font-display text-[26px] font-semibold leading-snug text-ink [text-wrap:balance]">{view.productTitle}</h1>
      <p className="mt-1 text-[13px] leading-6 text-dim">받는 분 {view.maskedName}</p>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-sage" />
          <h2 className="text-[15px] font-bold text-ink">진행 상황</h2>
        </div>
        <ol className="mt-5 grid grid-cols-6 gap-1" aria-label={`현재 ${TRACK_STAGES[current]}`}>
          {TRACK_STAGES.map((label, index) => (
            <li key={label} className="min-w-0 text-center">
              <span className={`mx-auto block h-1.5 rounded-full ${index <= current ? "bg-ink" : "bg-line"}`} />
              <span className={`mt-2 block text-[12px] leading-5 ${index === current ? "font-bold text-ink" : "text-dim"}`}>{label}</span>
            </li>
          ))}
        </ol>
        {view.warn && (
          <p className="mt-4 rounded-2xl bg-fog p-4 text-[13px] leading-6 text-ink">배달이 완료되지 않았습니다. 배송사의 재배달 안내를 확인해 주세요.</p>
        )}
      </section>

      {view.trackingNo && (
        <section className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-ink">운송장</h2>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-fog p-4">
            <div className="min-w-0">
              <p className="text-[12px] leading-5 text-dim">{view.carrier}</p>
              <p className="break-all font-mono text-[15px] font-semibold text-ink">{view.trackingNo}</p>
            </div>
            <CopyTrackingButton value={view.trackingNo} />
          </div>
          <a
            href={`https://t.17track.net/ko#nums=${encodeURIComponent(view.trackingNo)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-[12px] font-semibold text-dim underline hover:text-ink"
          >
            외부 사이트에서 상세 조회
          </a>
        </section>
      )}

      <section className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-ink">이동 기록</h2>
        {view.routes.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-fog p-4 text-[13px] leading-6 text-dim">
            상품을 준비하고 있습니다. 출고되면 이동 기록이 이곳에 표시됩니다.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {view.routes.map((route, index) => (
              <li key={`${route.time}-${index}`} className="flex gap-3">
                <span className={`mt-2 size-2 shrink-0 rounded-full ${index === 0 ? "bg-ink" : "bg-line"}`} />
                <div className="min-w-0">
                  <p className="text-[14px] leading-6 text-ink">{route.text}</p>
                  <p className="text-[12px] leading-5 text-dim">{[route.time, route.place].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-[12px] leading-5 text-dim">
          표시 시각은 운송 정보 기준입니다. 해외 배송은 운송사 사정에 따라 기록이 늦게 반영될 수 있습니다.
          {view.fetchedAt ? ` 마지막 갱신 ${new Date(view.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` : ""}
        </p>
      </section>
      <p className="mt-6 text-center text-[12px] text-dim">
        <Link href="/ko/track" className="font-semibold underline hover:text-ink">다른 주문 조회</Link>
      </p>
    </main>
  );
}
