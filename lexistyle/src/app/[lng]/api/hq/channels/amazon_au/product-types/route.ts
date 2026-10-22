import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getProductTypes } from "@/lib/channels/amazon/sp-api";
import { amazonAuFullyConfigured } from "@/lib/channels/amazon/constants";

export const dynamic = "force-dynamic";

/** GET — Product Type Definitions (A2 export 체크리스트용) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  if (!amazonAuFullyConfigured()) {
    return NextResponse.json({
      ok: false,
      mock: true,
      productTypes: [{ name: "PRODUCT", displayName: "Generic Product (fallback)" }],
    });
  }
  try {
    const res = await getProductTypes();
    const types = res.data.productTypes ?? [];
    return NextResponse.json({ ok: true, mock: false, productTypes: types.slice(0, 40) });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "product types failed", 502);
  }
}
