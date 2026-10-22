import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/admin";
import { appendMessage, createThread, listThreads } from "@/lib/cs-chat";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session?.user?.email) {
    return NextResponse.json({ threads: [] }, { status: 401 });
  }
  const threads = await listThreads(session.user.email);
  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      subject?: string;
      body?: string;
      threadId?: number | string;
      message?: string;
    };

    if (body.threadId != null && body.message) {
      const msg = await appendMessage({
        email: session.user.email,
        threadId: body.threadId,
        body: body.message,
      });
      const threads = await listThreads(session.user.email);
      return NextResponse.json({ ok: true, message: msg, threads });
    }

    if (!body.body) {
      return NextResponse.json({ error: "body required" }, { status: 400 });
    }
    const thread = await createThread({
      email: session.user.email,
      name: session.user.name,
      subject: body.subject || "일반 문의",
      body: body.body,
    });
    const threads = await listThreads(session.user.email);
    return NextResponse.json({ ok: true, thread, threads });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
