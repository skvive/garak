import { CatalogPipelinePanel } from "@/components/admin/catalog-pipeline-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · Export" };

/** 생성 PDP 목록(+썸네일) → 채널 송출. 3단 진열대기는 /hq/pipeline/export/shelf */
export default function HqExportPage() {
  return <CatalogPipelinePanel focus="export" />;
}
