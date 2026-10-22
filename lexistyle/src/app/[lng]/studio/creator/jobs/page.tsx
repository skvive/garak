import { StudioPageHeader } from "@/components/studio/studio-shell";
import { GenerationJobsPanel } from "@/components/studio/creator-panels";

export default function GenerationJobsPage() {
  return (
    <>
      <StudioPageHeader
        title="Generation Jobs"
        description="Cafe24 상품을 선택해 PDP·이미지·카드뉴스·스토리보드·영상·카피 작업을 생성합니다."
      />
      <GenerationJobsPanel />
    </>
  );
}
