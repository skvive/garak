// filepath: src/app/api/cafe24/status/route.ts
import { NextResponse } from "next/server";
import { cafe24StatusPayload, cafe24Mode } from "@/lib/cafe24/config";
import { listCafe24Products } from "@/lib/cafe24/catalog";
import { cafe24Fetch } from "@/lib/cafe24/client";
import { cafe24Connected } from "@/lib/cafe24/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = { ...cafe24StatusPayload(), connected: await cafe24Connected() };
  if (cafe24Mode() === "off") {
    return NextResponse.json({ ...base, ping: null, productSample: 0 });
  }

  try {
    const countRes = await cafe24Fetch<{ count?: number }>({
      path: "/products/count",
    });
    const products = await listCafe24Products();
    return NextResponse.json({
      ...base,
      ping: "ok",
      productCount: countRes.count ?? products?.length ?? 0,
      productSample: products?.slice(0, 3).map((p) => ({
        slug: p.slug,
        name: p.name,
        cafe24ProductNo: p.cafe24ProductNo,
      })),
    });
  } catch (e) {
    return NextResponse.json({
      ...base,
      ping: "error",
      error: e instanceof Error ? e.message : "unknown",
    });
  }
}
