import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { listCjPrivateInventory } from "@/lib/sourcing/connectors/cjdropshipping";
import { getState, mutate } from "@/lib/hq/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET — 내 인벤토리(선매입). 공개 카탈로그와 별 원장. */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const live = await listCjPrivateInventory();
    if (live.items.length) {
      await mutate((s) => {
        s.cjPrivateInventory = live.items;
        return live.items.length;
      });
    }
    const s = await getState();
    return NextResponse.json({
      items: live.items.length ? live.items : (s.cjPrivateInventory ?? []),
      mock: live.mock,
      kind: "private-inventory",
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "inventory failed", 500);
  }
}
