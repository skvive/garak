import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { syncCjSourcingOrders } from "@/lib/hq/cj-order-sync";
import {
  listChannelOrderQueue,
  pullChannelOrders,
  sourcePendingChannelOrders,
} from "@/lib/hq/services";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function currentAdmin() {
  const admin = await requireAdmin();
  return admin ?? null;
}

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ rows: await listChannelOrderQueue("coupang") });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: "pull" | "send" };
  try {
    if (body.action === "pull") {
      const result = await pullChannelOrders("coupang", { autoSource: false });
      return NextResponse.json({ result, rows: await listChannelOrderQueue("coupang") });
    }
    if (body.action === "send") {
      const result = await sourcePendingChannelOrders("coupang", admin.user.email ?? "account-orders");
      const cj = await syncCjSourcingOrders().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
      return NextResponse.json({ result, cj, rows: await listChannelOrderQueue("coupang") });
    }
    return NextResponse.json({ error: "action must be pull or send" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "operation failed" }, { status: 422 });
  }
}
