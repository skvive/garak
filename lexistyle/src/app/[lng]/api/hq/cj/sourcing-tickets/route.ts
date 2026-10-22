import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getState, mutate, nextId, iso } from "@/lib/hq/store";
import { CJ_SOURCING_PLATFORMS, type CjSourcingPlatform } from "@/lib/hq/cj-links";
import type { CjSourcingTicket, CjSourcingTicketStatus } from "@/lib/hq/cj-inventory-types";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set(CJ_SOURCING_PLATFORMS.map((p) => p.id));
const STATUSES = new Set<CjSourcingTicketStatus>(["received", "sourcing", "linked", "closed"]);

/** GET — 수동 소싱 티켓 (CJ OpenAPI 없음) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const s = await getState();
  const platform = new URL(req.url).searchParams.get("platform");
  let tickets = s.cjSourcingTickets ?? [];
  if (platform && PLATFORMS.has(platform as CjSourcingPlatform)) {
    tickets = tickets.filter((t) => t.platform === platform);
  }
  return NextResponse.json({ tickets, kind: "sourcing-ticket" });
}

/** POST { platform, sourceUrl, title?, note? } */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const platform = String(b.platform ?? "cj") as CjSourcingPlatform;
  if (!PLATFORMS.has(platform)) return bad("invalid platform");
  const sourceUrl = String(b.sourceUrl ?? "").trim();
  if (!sourceUrl) return bad("sourceUrl required");
  const ticket = await mutate((s) => {
    const row: CjSourcingTicket = {
      id: nextId(s),
      platform,
      sourceUrl,
      title: String(b.title ?? "").trim() || sourceUrl,
      note: String(b.note ?? "").trim(),
      status: "received",
      createdAt: iso(),
    };
    s.cjSourcingTickets = [row, ...(s.cjSourcingTickets ?? [])];
    return row;
  });
  return NextResponse.json(ticket);
}
