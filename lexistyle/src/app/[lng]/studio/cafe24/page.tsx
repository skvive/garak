import { StudioPageHeader } from "@/components/studio/studio-shell";
import { Cafe24Panel } from "@/components/admin/cafe24-panel";

export default function StudioCafe24Page() {
  return (
    <>
      <StudioPageHeader
        title="Cafe24 Connection"
        description="OAuth 연결과 상품 projection 동기화를 관리합니다. 상품·주문·재고의 실제 운영은 Cafe24 관리자에서 수행합니다."
      />
      <Cafe24Panel />
    </>
  );
}
