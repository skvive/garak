import { CatalogPipelinePanel } from "@/components/admin/catalog-pipeline-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 카탈로그" };

export default function HqCatalogPage() {
  return <CatalogPipelinePanel focus="catalog" />;
}
