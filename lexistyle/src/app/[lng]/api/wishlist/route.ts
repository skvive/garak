// filepath: src/app/api/wishlist/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasDb } from "@/db";
import { requireSession } from "@/lib/auth/admin";
import { listWishlistSlugs, toggleWishlist } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

/** 가락한상 더미 모드: 위시리스트를 쿠키에 저장 (DB 미연결 데모용) */
const WL_COOKIE = "ghs_wishlist";

async function memorySlugs(): Promise<string[]> {
  const jar = await cookies();
  try {
    return JSON.parse(jar.get(WL_COOKIE)?.value ?? "[]") as string[];
  } catch {
    return [];
  }
}

async function memoryToggle(slug: string): Promise<string[]> {
  const jar = await cookies();
  const cur = await memorySlugs();
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
  jar.set(WL_COOKIE, JSON.stringify(next), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return next;
}

export async function GET() {
  const session = await requireSession();
  if (!session?.user?.email) return NextResponse.json({ slugs: [] });
  if (!hasDb()) return NextResponse.json({ slugs: await memorySlugs() });
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

  if (!hasDb()) {
    const slugs = await memoryToggle(body.slug);
    return NextResponse.json({ slugs, supported: true });
  }

  const result = await toggleWishlist(session.user.email, session.user.name, body.slug);
  if (!result.supported) {
    return NextResponse.json({ error: "위시리스트는 아직 사용할 수 없습니다 (DB 미연결)" }, { status: 503 });
  }
  return NextResponse.json(result);
}
