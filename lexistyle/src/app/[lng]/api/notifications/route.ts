import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/admin";
import {
  listNotifications,
  markAllRead,
  markNotificationRead,
  unreadCount,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session?.user?.email) {
    return NextResponse.json({ items: [], unread: 0 }, { status: 401 });
  }
  const items = await listNotifications(session.user.email);
  const unread = await unreadCount(session.user.email);
  return NextResponse.json({ items, unread });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: number | string; all?: boolean };
  if (body.all) {
    const n = await markAllRead(session.user.email);
    return NextResponse.json({ ok: true, marked: n });
  }
  if (body.id == null) {
    return NextResponse.json({ error: "id or all required" }, { status: 400 });
  }
  const ok = await markNotificationRead(session.user.email, body.id);
  return NextResponse.json({ ok });
}
