import { OrdersPanel } from "@/components/admin/orders-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 주문" };

export default function HqOrdersPage() {
  return (
    <div>
      <h1 className="mb-4 font-display text-[24px] font-semibold">주문 원장</h1>
      <OrdersPanel />
    </div>
  );
}
