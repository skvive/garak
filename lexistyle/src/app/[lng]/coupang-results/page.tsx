import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "쿠팡 상품 등록 현황",
  description: "LEXI 상품의 쿠팡 등록 및 승인 현황입니다.",
};

const products = [
  ["CJJJCWMY00727", "LEXI 반려동물 쿠션 텐트 베드", 1, "https://www.coupang.com/vp/products/9775777545?itemId=29263902099&vendorItemId=96181533715"],
  ["CJJK1139730", "LEXI 여성 스웨이드 퍼 무스탕 재킷", 14, "https://www.coupang.com/vp/products/9775772512?itemId=29263884541&vendorItemId=96181517551"],
  ["CJLS3061165", "LEXI 여성 핑크 트위드 자켓 스커트 투피스 세트", 10, "https://www.coupang.com/vp/products/9767104900?itemId=29233574870&vendorItemId=96152439823"],
  ["CJLY3062288", "LEXI 여성 레오파드 브이넥 원피스", 6, "https://www.coupang.com/vp/products/9775773656?itemId=29263888455&vendorItemId=96181521041"],
  ["CJLY3064619", "LEXI 여성 라운드넥 미디 원피스", 56, "https://www.coupang.com/vp/products/9775774000?itemId=29263889546&vendorItemId=96181521848"],
  ["CJMY1224717", "LEXI 반려동물 포근한 텐트형 하우스", 9, "https://www.coupang.com/vp/products/9775775808?itemId=29263896218&vendorItemId=96181528422"],
  ["CJMY2563890", "LEXI 여성 버튼 포인트 터틀넥 니트 원피스", 36, "https://www.coupang.com/vp/products/9775772071?itemId=29263882885&vendorItemId=96181516243"],
  ["CJMY3060348", "LEXI 여성 도톰한 하이넥 니트 스웨터", 63, "https://www.coupang.com/vp/products/9775773248?itemId=29263886778&vendorItemId=96181519396"],
  ["CJQB1322244", "LEXI 여성 하운드투스 클래식 재킷", 4, "https://www.coupang.com/vp/products/9775782509?itemId=29263919123&vendorItemId=96181549756"],
  ["CJQB1562100", "LEXI 여성 루즈핏 미디 트렌치 코트 벨트세트", 9, "https://www.coupang.com/vp/products/9766978906?itemId=29233216567&vendorItemId=96152111542"],
  ["CJWY2812113", "LEXI 여성 코듀로이 후드 집업 재킷", 45, "https://www.coupang.com/vp/products/9775772367?itemId=29263884089&vendorItemId=96181517162"],
  ["CJWY3206345", "LEXI 남녀공용 3D 카무플라주 후드티", 11, "https://www.coupang.com/vp/products/9775772581?itemId=29263884742&vendorItemId=96181517882"],
  ["CJXZ1914107", "LEXI 남성 슬림핏 클래식 수트 재킷", 48, "https://www.coupang.com/vp/products/9775771866?itemId=29263882052&vendorItemId=96181515522"],
  ["CJXZ3183638", "LEXI 남성 레이어드 미디 트렌치코트", 10, "https://www.coupang.com/vp/products/9775772810?itemId=29263885560&vendorItemId=96181518433"],
  ["CJYD1910916", "LEXI 반려동물 펠트 크리스마스트리 노즈워크 장난감", 1, "https://www.coupang.com/vp/products/9775777466?itemId=29263901831&vendorItemId=96181533499"],
  ["CJYD3060906", "LEXI 여성 와이드 레그 긴소매 점프수트", 35, "https://www.coupang.com/vp/products/9775773453?itemId=29263887539&vendorItemId=96181520169"],
  ["CJYD3233379", "LEXI 여성 미디 롱 베스트 재킷", 1, "https://www.coupang.com/vp/products/9775771579?itemId=29263881261&vendorItemId=96181514853"],
  ["CJYH1178713", "LEXI 남성 농구 그래픽 후드티", 65, "https://www.coupang.com/vp/products/9775773060?itemId=29263886184&vendorItemId=96181518946"],
] as const;

export default function CoupangResultsPage() {
  return (
    <div className="min-h-dvh bg-[#f7f8f6] px-4 py-10 text-[#17201d] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] border border-[#dfe7e2] bg-white px-6 py-8 shadow-[0_16px_50px_rgba(23,32,29,0.06)] sm:px-10 sm:py-10">
          <div className="inline-flex rounded-full bg-[#eaf7f1] px-3 py-1 text-[12px] font-bold text-[#167451]">COUPANG LIVE</div>
          <h1 className="mt-4 text-balance text-[30px] font-bold leading-[1.3] sm:text-[42px]">쿠팡 상품 등록 현황</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[#66716d] sm:text-[15px]">
            2026년 10월 13일 기준 · CJ Added Products 중 쿠팡 승인이 완료된 상품입니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-[#17201d] px-5 py-3 text-white"><b className="text-[22px]">18</b><span className="ml-2 text-[13px] text-white/70">승인완료</span></div>
            <div className="rounded-2xl bg-[#f0f3f1] px-5 py-3"><b className="text-[22px]">424</b><span className="ml-2 text-[13px] text-[#66716d]">전체 옵션</span></div>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-[24px] border border-[#dfe7e2] bg-white shadow-[0_12px_40px_rgba(23,32,29,0.05)]">
          <div className="hidden grid-cols-[160px_1fr_90px_110px_120px] gap-4 border-b border-[#e7ece9] bg-[#f3f6f4] px-6 py-4 text-[12px] font-bold text-[#59645f] md:grid">
            <span>CJ SKU</span><span>상품명</span><span>옵션</span><span>상태</span><span>쿠팡</span>
          </div>
          <div className="divide-y divide-[#edf0ee]">
            {products.map(([sku, name, options, url]) => (
              <article key={sku} className="grid gap-3 px-5 py-5 md:grid-cols-[160px_1fr_90px_110px_120px] md:items-center md:gap-4 md:px-6 md:py-4">
                <code className="text-[12px] font-semibold text-[#53605b]">{sku}</code>
                <h2 className="text-balance text-[15px] font-semibold leading-[1.6]">{name}</h2>
                <div className="text-[13px] text-[#66716d]"><span className="md:hidden">옵션 </span>{options}개</div>
                <div><span className="inline-flex rounded-full bg-[#eaf7f1] px-3 py-1 text-[12px] font-bold text-[#167451]">승인완료</span></div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17201d] px-4 text-[13px] font-bold text-white transition hover:bg-[#2a3732] focus:outline-none focus:ring-2 focus:ring-[#63b898] focus:ring-offset-2">
                  상품 보기
                </a>
              </article>
            ))}
          </div>
        </section>

        <p className="mt-5 text-center text-[12px] leading-[1.7] text-[#77817d]">쿠팡 승인 및 노출 상태는 플랫폼 운영 정책에 따라 변경될 수 있습니다.</p>
      </div>
    </div>
  );
}
