// filepath: src/components/payment-success-client.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  provider?: string;
  paymentKey?: string;
  orderId?: string;
  amount?: string;
  sessionId?: string;
  transactionId?: string;
  fallbackRef?: string;
  fallbackTotal?: string;
};

export function PaymentSuccessClient(props: Props) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [ref, setRef] = useState(props.fallbackRef || "");
  const [total, setTotal] = useState(props.fallbackTotal || "");
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      try {
        if (props.provider === "toss" && props.paymentKey && props.orderId && props.amount) {
          const res = await fetch("/api/payments/toss/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentKey: props.paymentKey,
              orderId: props.orderId,
              amount: Number(props.amount),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "토스 승인 실패");
          setRef(data.paymentRef);
          if (data.totalUsd) setTotal(String(data.totalUsd));
          setStatus("ok");
          return;
        }

        if (props.provider === "stripe" && props.sessionId) {
          const res = await fetch("/api/payments/stripe/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: props.sessionId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Stripe 확인 실패");
          setRef(data.paymentRef);
          if (data.totalUsd) setTotal(String(data.totalUsd));
          setStatus("ok");
          return;
        }

        if (props.provider === "danal" && props.transactionId && props.orderId && props.amount) {
          const res = await fetch("/api/payments/danal/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: props.transactionId,
              orderId: props.orderId,
              amount: Number(props.amount),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "다날 승인 실패");
          setRef(data.paymentRef);
          if (data.totalUsd) setTotal(String(data.totalUsd));
          setStatus("ok");
          return;
        }

        // mock 또는 이미 확정된 폴백
        setStatus("ok");
      } catch (e) {
        setError((e as Error).message);
        setStatus("error");
      }
    }
    void run();
  }, [props]);

  if (status === "loading") {
    return <p className="text-[14px] text-dim">결제 승인 확인 중…</p>;
  }

  if (status === "error") {
    return (
      <>
        <p className="text-[13px] font-bold text-coral">PAYMENT ERROR</p>
        <h1 className="mt-2 font-display text-[28px] font-semibold">결제 확인 실패</h1>
        <p className="mt-3 text-[14px] text-dim">{error}</p>
      </>
    );
  }

  return (
    <>
      <p className="text-[13px] font-bold text-sage">ORDER CONFIRMED</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold">Thank you</h1>
      <p className="mt-3 text-[14px] text-dim">
        결제번호 <span className="price font-semibold text-ink">{ref || "—"}</span>
      </p>
      {total && <p className="price mt-1 text-[18px] font-bold">${Number(total).toFixed(2)}</p>}
      {props.provider && (
        <p className="mt-2 text-[12px] text-dim">provider: {props.provider}</p>
      )}
    </>
  );
}
