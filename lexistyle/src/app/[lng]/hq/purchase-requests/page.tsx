import { OrderInbox } from "@/components/hq/OrderInbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 구매요청" };

export default function HqPurchasePage() {
  return <OrderInbox />;
}
