import type { Metadata } from "next";
import StudioClient from "./studio-client";

export const metadata: Metadata = {
  title: "Seller Studio",
  description: "한국어 상품 자료에서 Shopee 상품등록과 주문 옵션 확인까지, LEXI Seller Studio.",
  robots: { index: false, follow: false },
};

export default function SellerStudioPage() {
  return <StudioClient />;
}
