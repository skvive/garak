import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { cjConfigured } from "@/lib/sourcing/connectors/cjdropshipping";
import { allowLookupAttempt } from "@/lib/hq/track-lookup";
import { isValidCjLookupReference, lookupPublicCjTracking } from "@/lib/hq/cj-public-tracking";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });

export async function POST(req: Request) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (!allowLookupAttempt(`cj-public:${ip}`, Date.now(), 6)) {
    return json({ error: "조회 시도가 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
  }
  if (!cjConfigured()) return json({ error: "배송 조회 연결을 준비하고 있습니다." }, 503);

  const body = (await req.json().catch(() => ({}))) as { reference?: unknown };
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!isValidCjLookupReference(reference)) {
    return json({ error: "CJ 주문번호 또는 운송장 번호를 확인해 주세요." }, 400);
  }
  const shipment = await lookupPublicCjTracking(reference);
  if (!shipment) return json({ error: "일치하는 배송 정보를 찾을 수 없습니다." }, 404);
  return json({ shipment });
}
