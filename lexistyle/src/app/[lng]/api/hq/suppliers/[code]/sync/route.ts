import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { importByUrl, syncSupplier } from "@/lib/sourcing/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST {pages?, category?} → 카탈로그 sync / POST {url} → URL 단건 임포트 */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const { code } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  try {
    const result = b.url
      ? await importByUrl(code, String(b.url))
      : await syncSupplier(code, { pages: b.pages, category: b.category });
    return NextResponse.json(result);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "sync failed", 422);
  }
}
