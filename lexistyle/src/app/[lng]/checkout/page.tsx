// filepath: src/app/checkout/page.tsx
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { readCart } from "@/lib/cart-store";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const items = await readCart();
  const subtotal = +items.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <h1 className="font-display text-[30px] font-semibold">Checkout</h1>
      <p className="mt-1 text-[13px] text-dim">
        Step 1/3 배송 · 게스트 가능 ·{" "}
        <Link href="/auth/sign-in" className="font-semibold text-coral">
          Google 로그인
        </Link>
      </p>
      {subtotal <= 0 ? (
        <div className="mt-8 rounded-2xl bg-fog p-8 text-center">
          <p className="text-[15px] font-semibold">담을 상품이 없습니다</p>
          <Link href="/cart" className="mt-3 inline-block text-[13px] font-bold text-coral">
            장바구니로 →
          </Link>
        </div>
      ) : (
        <CheckoutForm subtotal={subtotal} />
      )}
    </div>
  );
}
