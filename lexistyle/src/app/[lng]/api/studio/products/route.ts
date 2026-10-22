import { NextResponse } from "next/server";
import { listCafe24Products } from "@/lib/cafe24/catalog";
import { studioActor, unauthorized } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await studioActor())) return unauthorized();
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const products = (await listCafe24Products()) ?? [];
  const items = products
    .filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        String(p.cafe24ProductNo).includes(q),
    )
    .slice(0, 100)
    .map((p) => ({
      productNo: p.cafe24ProductNo,
      name: p.name,
      brand: p.brand,
      image: p.image,
      price: p.price,
    }));
  return NextResponse.json({ items });
}
