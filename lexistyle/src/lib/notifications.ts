/** 알림센터 — wishlist 패턴. DB 없으면 메모리 시드로 동작. */
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { notifications, users } from "@/db/schema";

export type NotificationItem = {
  id: number | string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

type MemRow = NotificationItem & { email: string };

const g = globalThis as unknown as { __lexiNotifs?: MemRow[] };
function mem(): MemRow[] {
  if (!g.__lexiNotifs) {
    g.__lexiNotifs = [];
  }
  return g.__lexiNotifs;
}

async function getOrCreateUserId(email: string, name?: string | null): Promise<number> {
  const d = db();
  const existing = await d.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await d.insert(users).values({ email, name: name ?? null }).returning({ id: users.id });
  return row.id;
}

function seedMemory(email: string): NotificationItem[] {
  const rows = mem().filter((r) => r.email === email);
  if (rows.length > 0) return rows.map(({ email: _e, ...r }) => r);

  const now = Date.now();
  const seeded: MemRow[] = [
    {
      email,
      id: `m1-${email}`,
      type: "order",
      title: "주문이 접수되었습니다",
      body: "결제 확인 후 물류센터에서 출고를 준비합니다.",
      href: "/account/orders",
      readAt: null,
      createdAt: new Date(now - 1000 * 60 * 30),
    },
    {
      email,
      id: `m2-${email}`,
      type: "promo",
      title: "타임특가 오픈",
      body: "오늘 자정까지 Beauty 카테고리 추가 할인.",
      href: "/sale",
      readAt: null,
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
    },
    {
      email,
      id: `m3-${email}`,
      type: "system",
      title: "환영합니다",
      body: "LEXI 알림센터에 오신 것을 환영합니다.",
      href: "/account",
      readAt: new Date(now - 1000 * 60 * 60 * 24),
      createdAt: new Date(now - 1000 * 60 * 60 * 24),
    },
  ];
  mem().push(...seeded);
  return seeded.map(({ email: _e, ...r }) => r);
}

export async function listNotifications(email: string): Promise<NotificationItem[]> {
  if (!hasDb()) return seedMemory(email);
  try {
    const userId = await getOrCreateUserId(email);
    const rows = await db()
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    if (rows.length === 0) {
      // 첫 방문 시 환영 알림 1건 생성
      await createNotification(email, {
        type: "system",
        title: "환영합니다",
        body: "LEXI 알림센터에 오신 것을 환영합니다.",
        href: "/account",
      });
      return listNotifications(email);
    }
    return rows;
  } catch {
    return seedMemory(email);
  }
}

export async function unreadCount(email: string): Promise<number> {
  const items = await listNotifications(email);
  return items.filter((n) => !n.readAt).length;
}

export async function markNotificationRead(
  email: string,
  id: number | string,
): Promise<boolean> {
  if (!hasDb()) {
    const row = mem().find((r) => r.email === email && String(r.id) === String(id));
    if (!row) return false;
    row.readAt = new Date();
    return true;
  }
  try {
    const userId = await getOrCreateUserId(email);
    const numId = typeof id === "number" ? id : Number(id);
    if (!Number.isFinite(numId)) return false;
    await db()
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, numId), eq(notifications.userId, userId)));
    return true;
  } catch {
    return false;
  }
}

export async function markAllRead(email: string): Promise<number> {
  if (!hasDb()) {
    let n = 0;
    for (const row of mem()) {
      if (row.email === email && !row.readAt) {
        row.readAt = new Date();
        n += 1;
      }
    }
    return n;
  }
  try {
    const userId = await getOrCreateUserId(email);
    const unread = await db()
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
          isNull(notifications.deletedAt),
        ),
      );
    for (const row of unread) {
      await db()
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, row.id));
    }
    return unread.length;
  } catch {
    return 0;
  }
}

export async function createNotification(
  email: string,
  input: { type?: string; title: string; body?: string; href?: string; name?: string | null },
): Promise<void> {
  if (!hasDb()) {
    mem().unshift({
      email,
      id: `m-${Date.now()}`,
      type: input.type ?? "info",
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      readAt: null,
      createdAt: new Date(),
    });
    return;
  }
  try {
    const userId = await getOrCreateUserId(email, input.name);
    await db().insert(notifications).values({
      userId,
      type: input.type ?? "info",
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      isDummy: false,
    });
  } catch {
    /* ignore */
  }
}
