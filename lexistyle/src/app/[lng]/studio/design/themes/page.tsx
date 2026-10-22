import { StudioPageHeader } from "@/components/studio/studio-shell";
import { ThemesPanel } from "@/components/studio/design-panels";

export const metadata = { title: "Studio · Themes" };

export default function StudioThemesPage() {
  return (
    <>
      <StudioPageHeader
        title="Design Themes"
        description="Cafe24 스킨과 LEXI 콘텐츠가 공유할 브랜드 토큰을 버전으로 관리합니다."
      />
      <ThemesPanel />
    </>
  );
}
