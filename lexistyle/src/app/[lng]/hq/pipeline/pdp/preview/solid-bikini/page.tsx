import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 솔리드 비키니 PDP 시드" };

export default function SolidBikiniPreviewPage() {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-[#f7f3ec]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4d9c8] px-4 py-3">
        <div>
          <p className="text-[12px] font-bold text-sage">LEXI Swim Edit · 시드 미리보기</p>
          <h1 className="text-balance font-display text-[22px] font-semibold">솔리드 비키니 HTML</h1>
        </div>
        <Link href="/pdp-preview/" className="rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-white">
          전체 HTML 열기
        </Link>
      </div>
      <iframe title="솔리드 비키니 PDP" src="/pdp-preview/" className="h-[78vh] w-full border-0 bg-[#f7f3ec]" />
    </div>
  );
}
