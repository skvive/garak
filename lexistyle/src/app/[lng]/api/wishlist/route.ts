// filepath: src/app/api/wishlist/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/admin";
import { listWishlistSlugs, toggleWishlist } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session?.user?.email) return NextResponse.json({ slugs: [] });
  const slugs = await listWishlistSlugs(session.user.email);
  return NextResponse.json({ slugs });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const body = (await req.json()) as { slug?: string };
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const result = await toggleWishlist(session.user.email, session.user.name, body.slug);
  if (!result.supported) {
    return NextResponse.json({ error: "위시리스트를 사용할 수 없습니다 (DB 미연결)" }, { status: 503 });
  }
  return NextResponse.json(result);
}
