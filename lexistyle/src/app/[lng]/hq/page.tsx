import { HqDashboardView } from "@/components/hq/HqDashboardView";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 홈" };

export default function HqHomePage() {
  return <HqDashboardView />;
}
