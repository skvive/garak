import { StudioPageHeader } from "@/components/studio/studio-shell";
import { DocumentsPanel } from "@/components/studio/creator-panels";

export default function ReviewQueuePage() {
  return (
    <>
      <StudioPageHeader title="Human Review Queue" description="사람이 검수하고 승인한 콘텐츠만 Cafe24 게시 단계로 이동합니다." />
      <DocumentsPanel reviewOnly />
    </>
  );
}
