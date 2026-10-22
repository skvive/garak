import { StudioPageHeader } from "@/components/studio/studio-shell";
import { DecisionsPanel } from "@/components/studio/creator-panels";

export default function DecisionsPage() {
  return (
    <>
      <StudioPageHeader
        title="Decision Queue"
        description="구현을 멈추지 않고 기본값으로 진행한 항목입니다. 운영 전 최종 결정을 기록하세요."
      />
      <DecisionsPanel />
    </>
  );
}
