import Link from "next/link";
import { Camera } from "lucide-react";

export const metadata = { title: "#LEXILOOK" };

/** 실제 고객 게시물 기능이 붙기 전까지 가상 계정 게시물을 노출하지 않는다 */
export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-[30px] font-semibold">#LEXILOOK</h1>
      <p className="mt-1 text-[13px] text-dim">LEXI 고객의 실착 사진을 모아 보여드릴 공간입니다.</p>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-line bg-fog/50 px-6 py-16 text-center">
        <Camera className="size-8 text-dim" />
        <p className="text-[15px] font-semibold text-ink">아직 공유된 실착 사진이 없어요</p>
        <p className="max-w-sm text-[13px] leading-relaxed text-dim">
          구매하신 상품을 착용한 사진에 #LEXILOOK 을 붙여 공유해 주시면 이곳에 소개해 드릴게요.
        </p>
        <Link href="/category/fashion" className="mt-2 rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-paper">
          셀렉션 둘러보기
        </Link>
      </div>
    </div>
  );
}
