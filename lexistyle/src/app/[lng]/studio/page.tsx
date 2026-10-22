import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Database, ShoppingBag } from "lucide-react";
import { StudioPageHeader } from "@/components/studio/studio-shell";
import { studioDashboard } from "@/lib/studio/store";
import { cafe24Connected } from "@/lib/cafe24/oauth";
import { cafe24StatusPayload } from "@/lib/cafe24/config";

export const metadata = { title: "LEXI Studio" };

export default async function StudioPage() {
  const [dashboard, connected] = await Promise.all([studioDashboard(), cafe24Connected()]);
  const cafe = cafe24StatusPayload();
  const stats = [
    ["홈 섹션", dashboard.counts.sections],
    ["PDP·콘텐츠", dashboard.counts.documents],
    ["미디어", dashboard.counts.media],
    ["생성 작업", dashboard.counts.jobs],
    ["승인 대기", dashboard.counts.review],
    ["게시 완료", dashboard.counts.published],
  ];
  return (
    <>
      <StudioPageHeader
        title="Design & Creator Control Room"
        description="Cafe24가 상품·주문·결제를 운영하고, LEXI Studio는 디자인·이미지·동영상·상세페이지를 제작해 Cafe24로 배포합니다."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <BoundaryCard
          title="Commerce System of Record"
          owner="Cafe24"
          description="상품 · 옵션 · 재고 · 회원 · 주문 · 결제 · 배송"
          icon={<ShoppingBag className="size-5" />}
          tone="coral"
        />
        <BoundaryCard
          title="Design & Content System"
          owner="LEXI Studio"
          description="테마 · 홈 섹션 · PDP · 이미지 · 영상 · 버전 · 승인"
          icon={<Database className="size-5" />}
          tone="ink"
        />
        <div className="rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center gap-2">
            {connected ? (
              <CheckCircle2 className="size-5 text-sage" />
            ) : (
              <CircleAlert className="size-5 text-coral" />
            )}
            <p className="text-[13px] font-bold">Cafe24 연결</p>
          </div>
          <p className="mt-3 text-[22px] font-bold">{connected ? "Connected" : "Action required"}</p>
          <p className="mt-1 text-[12px] text-dim">
            {cafe.mallId || "Mall ID 미설정"} · Shop #{cafe.shopNo}
          </p>
          <Link href="/studio/cafe24" className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-coral">
            연결 관리 <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-[11px] font-semibold text-dim">{label}</p>
            <p className="price mt-2 text-[25px] font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <WorkflowCard
          title="디자인 운영"
          steps={["테마 토큰 설정", "홈 섹션 구성·예약", "Published feed 확인", "Cafe24 스킨 반영"]}
          href="/studio/design/home"
        />
        <WorkflowCard
          title="콘텐츠 운영"
          steps={["Cafe24 상품 선택", "PDP·이미지·영상 생성", "사람 승인", "Cafe24 게시·성과 기록"]}
          href="/studio/creator/jobs"
        />
      </div>
    </>
  );
}

function BoundaryCard({
  title,
  owner,
  description,
  icon,
  tone,
}: {
  title: string;
  owner: string;
  description: string;
  icon: React.ReactNode;
  tone: "coral" | "ink";
}) {
  return (
    <div className={`rounded-2xl p-5 text-white ${tone === "coral" ? "bg-coral" : "bg-ink"}`}>
      <div className="flex items-center gap-2 text-white/80">
        {icon}
        <p className="text-[11px] font-bold tracking-wide">{title}</p>
      </div>
      <p className="mt-3 text-[24px] font-bold">{owner}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/75">{description}</p>
    </div>
  );
}

function WorkflowCard({ title, steps, href }: { title: string; steps: string[]; href: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <p className="text-[16px] font-bold">{title}</p>
      <ol className="mt-4 grid gap-2">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-[13px]">
            <span className="price grid size-6 place-items-center rounded-full bg-fog text-[11px] font-bold">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Link href={href} className="mt-5 inline-flex items-center gap-1 text-[12px] font-bold text-coral">
        시작하기 <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
