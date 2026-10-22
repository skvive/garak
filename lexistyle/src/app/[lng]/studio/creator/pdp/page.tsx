import { StudioPageHeader } from "@/components/studio/studio-shell";
import { DocumentsPanel } from "@/components/studio/creator-panels";

export default function PdpDocumentsPage() {
  return (
    <>
      <StudioPageHeader title="PDP Documents" description="Cafe24 product_no에 연결된 상세페이지 문서와 immutable 버전을 관리합니다." />
      <DocumentsPanel />
    </>
  );
}
