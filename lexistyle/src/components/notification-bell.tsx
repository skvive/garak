import Link from "next/link";
import { Bell } from "lucide-react";
import { requireSession } from "@/lib/auth/admin";
import { unreadCount } from "@/lib/notifications";

export async function NotificationBell() {
  const session = await requireSession();
  const email = session?.user?.email;
  let unread = 0;
  if (email) {
    try {
      unread = await unreadCount(email);
    } catch {
      unread = 0;
    }
  }

  return (
    <Link
      href={email ? "/account/notifications" : "/auth/sign-in"}
      aria-label={unread ? `알림 ${unread}건` : "알림"}
      className="relative hidden size-11 place-items-center rounded-full hover:bg-fog md:grid"
    >
      <Bell className="size-[22px]" strokeWidth={1.7} />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 grid min-w-[16px] place-items-center rounded-full bg-coral px-1 text-[9px] font-bold leading-none text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
