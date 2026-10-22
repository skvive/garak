// filepath: src/app/checkout/success/page.tsx
import Link from "next/link";
import { PaymentSuccessClient } from "@/components/payment-success-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order confirmed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    total?: string;
    provider?: string;
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    session_id?: string;
    transactionId?: string;
  }>;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <PaymentSuccessClient
        provider={sp.provider}
        paymentKey={sp.paymentKey}
        orderId={sp.orderId}
        amount={sp.amount}
        sessionId={sp.session_id}
        transactionId={sp.transactionId}
        fallbackRef={sp.ref}
        fallbackTotal={sp.total}
      />
      <div className="mt-8 flex flex-col gap-2">
        <Link
          href="/account/orders"
          className="rounded-xl bg-ink py-3 text-[14px] font-bold text-white"
        >
          주문 내역 보기
        </Link>
        <Link href="/" className="rounded-xl border border-line py-3 text-[14px] font-semibold">
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}
