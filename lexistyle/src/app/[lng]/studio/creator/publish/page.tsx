import { StudioPageHeader } from "@/components/studio/studio-shell";
import { PublishPanel } from "@/components/studio/creator-panels";

export default function PublishPage() {
  return (
    <>
      <StudioPageHeader
        title="Cafe24 Publish & Rollback"
        description="승인된 PDP를 Cafe24 상품 상세로 게시하고 원격 결과·실패·이전 버전을 추적합니다."
      />
      <PublishPanel />
    </>
  );
}
