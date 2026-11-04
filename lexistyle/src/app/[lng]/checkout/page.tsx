import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { readCart } from "@/lib/cart-store";

export const metadata = { title: "주문·결제 | 가락한상" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // No valid merchant SKU-to-payment mapping, approved stock or KRW settlement
  // exists yet. Keep test-mode tools in development but no live checkout.
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <span className="inline-block rounded-full border border-line bg-fog px-3 py-2 text-xs font-bold text-dim">주문·결제 준비 중</span>
        <h1 className="mt-4 text-3xl font-bold text-ink">판매 승인된 상품부터 주문을 시작합니다.</h1>
        <p className="mt-4 text-sm leading-7 text-dim">
          입점 점포, 상품 실물 사진, 가격·재고, 배송·환불 및 결제 정산을 검증하고 있습니다.
          현재 온라인 신규 주문과 결제는 접수하지 않으며 결제 대금도 청구하지 않습니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#verified-products" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">승인 상품 확인</Link>
          <Link href="/support" className="rounded-full border border-line px-5 py-3 text-sm font-semibold">운영 문의</Link>
        </div>
      </main>
    );
  }

  const items = await readCart();
  const subtotal = +items.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <h1 className="font-display text-[30px] font-semibold">개발 환경 결제 테스트</h1>
      <p className="mt-1 text-[13px] text-dim">실거래 불가 · 개발·검증 전용</p>
      {subtotal <= 0 ? (
        <div className="mt-8 rounded-2xl bg-fog p-8 text-center">
          <p className="text-[15px] font-semibold">담을 상품이 없습니다</p>
          <Link href="/cart" className="mt-3 inline-block text-[13px] font-bold text-coral">장바구니로 →</Link>
        </div>
      ) : <CheckoutForm subtotal={subtotal} />}
    </div>
  );
}
