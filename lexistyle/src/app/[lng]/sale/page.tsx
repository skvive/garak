export const metadata = { title: "Sale" };
export const dynamic = "force-dynamic";

/** Sale — 큐레이션 전까지 목록 비움 */
export default async function SalePage() {
  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="pdp-cta-gradient px-4 py-6 text-white">
        <h1 className="font-display text-[26px] font-semibold">
          Sale<span className="opacity-80">.</span>
        </h1>
        <p className="mt-1 text-[13px] text-white/85">할인 큐레이션 준비 중</p>
      </div>
      <p className="mt-16 px-4 text-center text-dim">진행 중인 할인 상품이 없습니다.</p>
    </div>
  );
}
