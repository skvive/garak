/** 1:1 CS 채팅 — DB 또는 메모리 폴백 */
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { csMessages, csThreads, users } from "@/db/schema";

export type CsMessage = {
  id: number | string;
  sender: "user" | "agent";
  body: string;
  createdAt: Date;
};

export type CsThread = {
  id: number | string;
  subject: string;
  status: string;
  guestEmail: string | null;
  createdAt: Date;
  messages: CsMessage[];
};

type MemThread = Omit<CsThread, "messages"> & {
  emailKey: string;
  messages: CsMessage[];
};

const g = globalThis as unknown as { __lexiCs?: MemThread[] };
function mem(): MemThread[] {
  if (!g.__lexiCs) g.__lexiCs = [];
  return g.__lexiCs;
}

async function getOrCreateUserId(email: string, name?: string | null): Promise<number> {
  const d = db();
  const existing = await d.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await d.insert(users).values({ email, name: name ?? null }).returning({ id: users.id });
  return row.id;
}

const AUTO_REPLY =
  "문의 감사합니다. LEXI 고객센터가 영업일 기준 24시간 이내에 답변드립니다. (자동 안내)";

export async function listThreads(email: string): Promise<CsThread[]> {
  if (!hasDb()) {
    return mem()
      .filter((t) => t.emailKey === email.toLowerCase())
      .map(({ emailKey: _e, ...t }) => t)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  try {
    const userId = await getOrCreateUserId(email);
    const threads = await db()
      .select()
      .from(csThreads)
      .where(and(eq(csThreads.userId, userId), isNull(csThreads.deletedAt)))
      .orderBy(desc(csThreads.createdAt))
      .limit(20);

    const out: CsThread[] = [];
    for (const t of threads) {
      const msgs = await db()
        .select()
        .from(csMessages)
        .where(eq(csMessages.threadId, t.id))
        .orderBy(asc(csMessages.createdAt));
      out.push({
        id: t.id,
        subject: t.subject,
        status: t.status,
        guestEmail: t.guestEmail,
        createdAt: t.createdAt,
        messages: msgs.map((m) => ({
          id: m.id,
          sender: m.sender as "user" | "agent",
          body: m.body,
          createdAt: m.createdAt,
        })),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function createThread(opts: {
  email: string;
  name?: string | null;
  subject: string;
  body: string;
}): Promise<CsThread> {
  const subject = opts.subject.trim() || "일반 문의";
  const body = opts.body.trim();
  if (!body) throw new Error("메시지를 입력해 주세요");

  if (!hasDb()) {
    const thread: MemThread = {
      emailKey: opts.email.toLowerCase(),
      id: `t-${Date.now()}`,
      subject,
      status: "waiting",
      guestEmail: opts.email,
      createdAt: new Date(),
      messages: [
        { id: `m-${Date.now()}`, sender: "user", body, createdAt: new Date() },
        {
          id: `m-${Date.now() + 1}`,
          sender: "agent",
          body: AUTO_REPLY,
          createdAt: new Date(Date.now() + 500),
        },
      ],
    };
    mem().unshift(thread);
    const { emailKey: _e, ...rest } = thread;
    return rest;
  }

  const userId = await getOrCreateUserId(opts.email, opts.name);
  const database = db();
  const [thread] = await database
    .insert(csThreads)
    .values({
      userId,
      guestEmail: opts.email,
      subject,
      status: "waiting",
      isDummy: false,
    })
    .returning();

  await database.insert(csMessages).values({
    threadId: thread.id,
    sender: "user",
    body,
  });
  await database.insert(csMessages).values({
    threadId: thread.id,
    sender: "agent",
    body: AUTO_REPLY,
  });

  return (await listThreads(opts.email)).find((t) => t.id === thread.id)!;
}

export async function appendMessage(opts: {
  email: string;
  threadId: number | string;
  body: string;
}): Promise<CsMessage> {
  const body = opts.body.trim();
  if (!body) throw new Error("메시지를 입력해 주세요");

  if (!hasDb()) {
    const thread = mem().find(
      (t) => t.emailKey === opts.email.toLowerCase() && String(t.id) === String(opts.threadId),
    );
    if (!thread) throw new Error("대화를 찾을 수 없습니다");
    const msg: CsMessage = {
      id: `m-${Date.now()}`,
      sender: "user",
      body,
      createdAt: new Date(),
    };
    thread.messages.push(msg);
    thread.status = "waiting";
    thread.messages.push({
      id: `m-${Date.now() + 1}`,
      sender: "agent",
      body: "추가 문의 접수되었습니다. 순차적으로 확인하겠습니다.",
      createdAt: new Date(Date.now() + 400),
    });
    return msg;
  }

  const userId = await getOrCreateUserId(opts.email);
  const numId = typeof opts.threadId === "number" ? opts.threadId : Number(opts.threadId);
  if (!Number.isFinite(numId)) throw new Error("invalid thread");

  const [thread] = await db()
    .select()
    .from(csThreads)
    .where(and(eq(csThreads.id, numId), eq(csThreads.userId, userId)))
    .limit(1);
  if (!thread) throw new Error("대화를 찾을 수 없습니다");

  const [msg] = await db()
    .insert(csMessages)
    .values({ threadId: numId, sender: "user", body })
    .returning();

  await db().insert(csMessages).values({
    threadId: numId,
    sender: "agent",
    body: "추가 문의 접수되었습니다. 순차적으로 확인하겠습니다.",
  });
  await db().update(csThreads).set({ status: "waiting" }).where(eq(csThreads.id, numId));

  return {
    id: msg.id,
    sender: "user",
    body: msg.body,
    createdAt: msg.createdAt,
  };
}
