import Link from "next/link";

export const metadata = { title: "수산 시세·점포 안내 | 가락한상" };
export const dynamic = "force-dynamic";

const CHECKS = [
  { title: "실제 시세", description: "실제 시장 경매 자료와 점포 판매가를 구분하여 확인한 후 등록합니다." },
  { title: "구성·중량", description: "회·활어의 어종, 손질 방식, 중량, 포함 구성을 점포별로 검증합니다." },
  { title: "판매 가능 여부", description: "사업자·입점 승인, 촬영 사진, 당일 재고와 배송 조건을 확인합니다." },
] as const;

export default function PricesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <p className="text-xs font-bold tracking-[.16em] text-sage">GARAK HANSANG · MARKET INFORMATION</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">수산 시세·점포 안내</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-dim">
        시세는 실제 수집·확인된 자료만 제공합니다. 현재 가락한상숍에는 검증된 당일 경매 시세 피드가
        연결되어 있지 않아, 임의 계산한 가격·전일 대비 변동률은 표시하지 않습니다.
      </p>
      <section className="mt-9 rounded-2xl border border-line bg-fog p-6 sm:p-8" aria-label="시세 제공 상태">
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-bold text-dim">시세 데이터 검증 중</span>
        <h2 className="mt-4 text-xl font-bold">오늘의 실시간 시세는 아직 제공되지 않습니다.</h2>
        <p className="mt-3 text-sm leading-7 text-dim">
          점포 판매가와 시장 경매가는 서로 다를 수 있습니다. 출처·기준 시각·규격이 확인된 뒤 품목별로 공개합니다.
        </p>
        <Link href="/#verified-products" className="mt-5 inline-block rounded-full bg-ink px-5 py-3 text-sm font-bold text-white">
          승인된 상품 확인하기
        </Link>
      </section>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {CHECKS.map((item, i) => (
          <article key={item.title} className="rounded-xl border border-line bg-paper p-5">
            <span className="text-xs font-bold text-coral">0{i + 1}</span>
            <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-dim">{item.description}</p>
          </article>
        ))}
      </div>
      <section className="mt-12 border-t border-line pt-8" aria-label="광양수산 현장 확인 내용">
        <h2 className="text-xl font-bold">광양수산 현장 조사 기록</h2>
        <p className="mt-3 text-sm leading-7 text-dim">
          가락몰 현장 사진 조사 원장(2026년 11월 1일 등록)에 따르면 광양수산의 명함 및 매장 사진에서
          판매동 1층 수산부 54호, 엘리베이터 10호기 앞 위치를 확인했습니다.
          자료에는 회·수산물 사진 메뉴와 수조도 기록되어 있습니다.
        </p>
        <p className="mt-3 rounded-lg bg-fog p-4 text-xs leading-6 text-dim">
          촬영일과 현재 영업 상태, 입점계약, 실제 메뉴·가격·재고는 별도 확인 전입니다.
          현장 사진상 상호 확인이 온라인 판매 승인이나 주문 가능 상태를 의미하지 않습니다.
        </p>
      </section>
    </main>
  );
}
