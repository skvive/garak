import { Suspense } from "react";
import { SettlementDashboard } from "@/components/hq/SettlementDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 정산" };

export default function HqSettlementsPage() {
  return (
    <Suspense>
      <SettlementDashboard />
    </Suspense>
  );
}
