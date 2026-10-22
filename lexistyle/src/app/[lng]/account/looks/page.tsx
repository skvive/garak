import { LookStudio } from "@/app/looks/look-studio";

export const metadata = { title: "내 룩보드" };

export default function AccountLooksPage() {
  return (
    <LookStudio intro="마이에서 연 룩보드입니다. 슬롯을 바꿔 오늘의 착장을 저장하고, 구성 그대로 장바구니에 담을 수 있습니다." />
  );
}
