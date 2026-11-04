import Link from "next/link";
export const metadata = { title: "검수 완료 상품 | 가락한상" };
export const dynamic = "force-dynamic";

export default function BestPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <p className="text-xs font-bold tracking-[0.16em] text-sage">GARAK HANSANG · PRODUCT REVIEW</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">검수 완료 상품 안내</h1>
      <p className="mt-4 text-[14px] leading-7 text-dim">
        승인된 점포의 실제 상품만 안내합니다. 지금은 가격·실물 사진·재고와 배송 조건을 확인하고 있습니다.
        원본 메뉴 시안과 시연용 리뷰·판매 순위는 구매 실적으로 표시하지 않습니다.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-fog p-8">
        <p className="text-lg font-bold">실제 상품 등록 절차 진행 중</p>
        <p className="mt-2 text-sm leading-7 text-dim">
          상품이 승인되면 정식 카테고리와 가락한상숍 홈페이지에 공개됩니다.
          오늘의 경매 시세나 할인율은 실측 데이터 없이 생성하지 않습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/#verified-products" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            검수 완료 상품 확인
          </Link>
          <Link href="/prices" className="rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold">
            수산 시세·점포 안내
          </Link>
        </div>
      </div>
    </main>
  );
}
