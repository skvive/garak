// filepath: src/app/cart/page.tsx
import { CartClient } from "@/components/cart-client";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
      <h1 className="font-display text-[30px] font-semibold">Cart</h1>
      <CartClient />
    </div>
  );
}
