import { LedgerMonitor } from "@/components/hq/LedgerMonitor";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 분산원장" };

export default function HqLedgerPage() {
  return <LedgerMonitor />;
}
