import { SourcingConsole } from "@/components/admin/sourcing-console";
import { SupplierProvidersPanel } from "@/components/hq/SupplierProvidersPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 공급처" };

export default function HqSuppliersPage() {
  return (
    <div className="space-y-8">
      <SupplierProvidersPanel />
      <SourcingConsole />
    </div>
  );
}
