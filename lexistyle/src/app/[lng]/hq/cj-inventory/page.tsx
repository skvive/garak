import { CjInventoryBoard } from "@/components/hq/CjInventoryBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 내 재고" };

export default function HqCjInventoryPage() {
  return <CjInventoryBoard />;
}
