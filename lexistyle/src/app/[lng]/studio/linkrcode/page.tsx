import { StudioPageHeader } from "@/components/studio/studio-shell";
import { LinkrcodeStudio } from "@/components/studio/linkrcode-studio";

export const metadata = { title: "linkrcode Studio" };

export default function LinkrcodeStudioPage() {
  return (
    <>
      <StudioPageHeader
        title="linkrcode Studio"
        description="자연어로 상품 상세페이지를 생성하고(Prompt → Preview → Publish), 골든 템플릿으로 저장해 페이지 공장에서 대량 생성합니다."
      />
      <LinkrcodeStudio />
    </>
  );
}
