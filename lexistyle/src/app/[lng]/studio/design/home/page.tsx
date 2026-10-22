import { StudioPageHeader } from "@/components/studio/studio-shell";
import { SectionsPanel } from "@/components/studio/design-panels";

export const metadata = { title: "Studio · Home Sections" };

export default function StudioHomePage() {
  return (
    <>
      <StudioPageHeader
        title="Home Section Board"
        description="섹션을 만들고 순서·상태를 관리합니다. published 섹션은 LEXI preview 홈에 즉시 반영됩니다."
      />
      <SectionsPanel />
    </>
  );
}
