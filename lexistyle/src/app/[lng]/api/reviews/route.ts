// filepath: src/app/api/reviews/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/admin";
import { createReview, listReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const reviews = await listReviews(slug);
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const body = (await req.json()) as { slug?: string; rating?: number; body?: string };
  if (!body.slug || !body.rating || !body.body) {
    return NextResponse.json({ error: "slug, rating, body required" }, { status: 400 });
  }
  const result = await createReview(session.user.email, session.user.name, body.slug, body.rating, body.body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true });
}
