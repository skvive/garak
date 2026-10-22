import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getCoupangHealthSnapshot, probeCoupangHealth } from "@/lib/channels/coupang/health";
import {
  fetchCoupangWingSettlement,
  listCoupangInquiries,
  listCoupangReturns,
  listCoupangSellerProducts,
  replyCoupangInquiry,
  resumeCoupangVendorItem,
  setCoupangVendorItemQty,
  stopCoupangVendorItem,
  syncCoupangStockFromHq,
} from "@/lib/channels/coupang/ops";

export const dynamic = "force-dynamic";

/** GET ?probe=1 | view=listings|settlements|inquiries|returns */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  if (url.searchParams.get("probe") === "1") {
    return NextResponse.json(await probeCoupangHealth());
  }
  const view = url.searchParams.get("view");
  try {
    if (view === "listings") return NextResponse.json({ items: await listCoupangSellerProducts() });
    if (view === "settlements") return NextResponse.json(await fetchCoupangWingSettlement());
    if (view === "inquiries") return NextResponse.json({ items: await listCoupangInquiries() });
    if (view === "returns") return NextResponse.json({ items: await listCoupangReturns() });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "coupang view failed", 502);
  }
  return NextResponse.json(getCoupangHealthSnapshot());
}

export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  let body: { action?: string; vendorItemId?: string; quantity?: number; inquiryId?: string; content?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("invalid json");
  }
  try {
    switch (body.action) {
      case "pull-returns": {
        const { pullChannelReturns } = await import("@/lib/hq/services");
        return NextResponse.json(await pullChannelReturns("coupang"));
      }
      case "sync-stock":
        return NextResponse.json(await syncCoupangStockFromHq());
      case "set-qty":
        if (!body.vendorItemId) return bad("vendorItemId required");
        return NextResponse.json(await setCoupangVendorItemQty(body.vendorItemId, Number(body.quantity ?? 0)));
      case "stop":
        if (!body.vendorItemId) return bad("vendorItemId required");
        return NextResponse.json(await stopCoupangVendorItem(body.vendorItemId));
      case "resume":
        if (!body.vendorItemId) return bad("vendorItemId required");
        return NextResponse.json(await resumeCoupangVendorItem(body.vendorItemId));
      case "reply-inquiry":
        if (!body.inquiryId) return bad("inquiryId required");
        return NextResponse.json(await replyCoupangInquiry(body.inquiryId, body.content));
      default:
        return bad("unknown action");
    }
  } catch (e) {
    return bad(e instanceof Error ? e.message : "coupang action failed", 502);
  }
}
