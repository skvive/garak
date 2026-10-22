import Link from "next/link";
import { requireSession } from "@/lib/auth/admin";
import { listNotifications } from "@/lib/notifications";
import { NotificationsClient } from "@/components/notifications-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "알림" };

export default async function NotificationsPage() {
  const session = await requireSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold">알림</h1>
        <p className="mt-4 text-[14px] text-dim">
          <Link href="/auth/sign-in" className="font-bold text-coral">
            로그인
          </Link>
          후 알림을 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const items = await listNotifications(email);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-[28px] font-semibold">알림</h1>
      <p className="mt-1 text-[13px] text-dim">
        읽지 않음 {items.filter((n) => !n.readAt).length}건
      </p>
      <NotificationsClient
        initial={items.map((n) => ({
          ...n,
          readAt: n.readAt?.toISOString?.() ?? (n.readAt as string | null),
          createdAt:
            n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
        }))}
      />
    </div>
  );
}
