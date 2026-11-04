import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "no-store, max-age=0" };

// Minimal release readiness probe: no credentials, merchant personal information,
// payment amounts or private evidence links leave this endpoint.
export async function GET() {
  if (!hasDb()) {
    return NextResponse.json(
      { ok: false, database: "disconnected", checkoutEnabled: false },
      { status: 503, headers: privateHeaders },
    );
  }
  try {
    const result = await db().execute(sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE release_ready IS TRUE)::int AS ready
      FROM public.garak_partner_release_ready
      WHERE merchant_slug = 'gwangyang-fisheries'
    `);
    const counts = result.rows[0] as { total?: number; ready?: number } | undefined;
    return NextResponse.json(
      {
        ok: true,
        database: "reachable",
        merchandising: Number(counts?.ready ?? 0) > 0 ? "verified-products-available" : "verification-pending",
        checkoutEnabled: false,
        inventoryState: Number(counts?.total ?? 0) > 0 ? "imported-and-gated" : "no-catalog",
        checkedAt: new Date().toISOString(),
      },
      { status: 200, headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { ok: false, database: "verification-query-failed", checkoutEnabled: false },
      { status: 503, headers: privateHeaders },
    );
  }
}
