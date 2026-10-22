import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { mutate } from "@/lib/hq/store";
import type { CjSourcingTicketStatus } from "@/lib/hq/cj-inventory-types";

export const dynamic = "force-dynamic";

const STATUSES = new Set<CjSourcingTicketStatus>(["received", "sourcing", "linked", "closed"]);

/** PATCH { status?, note?, title?, linkedPid? } */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  try {
    const row = await mutate((s) => {
      const t = (s.cjSourcingTickets ?? []).find((x) => x.id === Number(id));
      if (!t) throw new Error("ticket not found");
      if (b.status && STATUSES.has(b.status)) t.status = b.status;
      if (typeof b.note === "string") t.note = b.note;
      if (typeof b.title === "string") t.title = b.title;
      if (typeof b.linkedPid === "string") {
        t.linkedPid = b.linkedPid.trim() || undefined;
        if (t.linkedPid) t.status = "linked";
      }
      return t;
    });
    return NextResponse.json(row);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed", 422);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const { id } = await ctx.params;
  await mutate((s) => {
    s.cjSourcingTickets = (s.cjSourcingTickets ?? []).filter((x) => x.id !== Number(id));
    return true;
  });
  return NextResponse.json({ ok: true });
}
