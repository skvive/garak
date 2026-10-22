import { NextResponse } from "next/server";
import { getState } from "@/lib/hq/store";
import { syncSupplier } from "@/lib/sourcing/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 일 1회: active 공급처 전체 sync — vercel.json crons */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const s = await getState();
  const results = [];
  for (const supplier of s.suppliers.filter((x) => x.status === "active")) {
    try {
      results.push(await syncSupplier(supplier.code));
    } catch (e) {
      results.push({ supplier: supplier.code, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return NextResponse.json({ results });
}
