import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { audit, iso, mutate, nextId } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

/** GET — 현재 사용자 컬렉션 목록 (ownerEmail 필터) */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const { getState } = await import("@/lib/hq/store");
  const s = await getState();
  const email = (await hqActor(req)) ?? "demo@lexi.style";
  // ownerEmail이 없으면 전체(하위호환), 있으면 본인 것만
  const mine = s.collections.filter((c) => !c.ownerEmail || c.ownerEmail === email);
  return NextResponse.json({ collections: mine });
}

/** POST — 새 컬렉션 생성 (본인 소유) */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  if (!b.name) return bad("name required");
  const email = actor ?? "demo@lexi.style";
  return NextResponse.json(
    await mutate((s) => {
      const slug = String(b.slug ?? b.name).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-");
      if (s.collections.some((c) => c.slug === slug)) throw new Error("duplicate slug");
      const col = {
        id: nextId(s), slug, name: String(b.name), note: b.note,
        ownerEmail: email, createdAt: iso(),
      };
      s.collections.push(col);
      audit(s, "collection", col.id, "created", actor);
      return col;
    }),
  );
}
