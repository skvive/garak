import { StudioPageHeader } from "@/components/studio/studio-shell";
import { MediaLibraryPanel } from "@/components/studio/creator-panels";

export default function MediaLibraryPage() {
  return (
    <>
      <StudioPageHeader title="Media Library" description="PDP·카드뉴스·동영상에 사용할 자산과 메타데이터를 관리합니다." />
      <MediaLibraryPanel />
    </>
  );
}
