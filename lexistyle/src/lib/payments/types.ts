// filepath: src/lib/payments/types.ts
export type PaymentProvider = "mock" | "stripe" | "toss" | "danal";

export type PaymentInitResult =
  | {
      provider: "mock";
      orderId: number;
      paymentRef: string;
      redirectUrl: string;
    }
  | {
      provider: "stripe";
      orderId: number;
      paymentOrderId: string;
      checkoutUrl: string;
    }
  | {
      provider: "toss";
      orderId: number;
      paymentOrderId: string;
      amountKrw: number;
      orderName: string;
      clientKey: string;
      customerKey: string;
      successUrl: string;
      failUrl: string;
    }
  | {
      provider: "danal";
      orderId: number;
      paymentOrderId: string;
      amountKrw: number;
      orderName: string;
      clientKey: string;
      merchantId: string;
      sandbox: boolean;
      returnUrl: string;
    };
