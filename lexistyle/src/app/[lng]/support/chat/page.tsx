import Link from "next/link";
import { requireSession } from "@/lib/auth/admin";
import { CsChatClient } from "@/components/cs-chat-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "1:1 채팅상담" };

export default async function SupportChatPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/support" className="text-[12px] font-semibold text-dim hover:text-ink">
        ← Support
      </Link>
      <h1 className="mt-2 font-display text-[28px] font-semibold">채팅상담</h1>
      <p className="mt-1 text-[13px] text-dim">영업일 기준 24시간 이내 답변</p>
      <div className="mt-6">
        <CsChatClient signedIn={Boolean(session?.user?.email)} />
      </div>
    </div>
  );
}
