import { SourcingOrdersBoard } from "@/components/hq/SourcingOrdersBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 소싱발주" };

export default function HqSourcingOrdersPage() {
  return <SourcingOrdersBoard />;
}
