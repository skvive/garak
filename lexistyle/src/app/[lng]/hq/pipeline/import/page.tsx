import { CatalogPipelinePanel } from "@/components/admin/catalog-pipeline-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · Import" };

export default function HqImportPage() {
  return <CatalogPipelinePanel focus="import" />;
}
