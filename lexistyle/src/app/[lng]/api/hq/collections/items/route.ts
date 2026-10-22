import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { audit, iso, mutate, nextId } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

/** POST {collectionId, supplierProductIds[]} → 담기 */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  if (!b.collectionId || !Array.isArray(b.supplierProductIds)) return bad("collectionId, supplierProductIds[] required");
  return NextResponse.json(
    await mutate((s) => {
      let added = 0;
      for (const spId of b.supplierProductIds as number[]) {
        if (!s.supplierProducts.some((p) => p.id === spId)) continue;
        if (s.collectionItems.some((i) => i.collectionId === b.collectionId && i.supplierProductId === spId)) continue;
        s.collectionItems.push({
          id: nextId(s), collectionId: b.collectionId, supplierProductId: spId,
          decision: "candidate", pinnedAt: iso(),
        });
        added++;
      }
      audit(s, "collection", b.collectionId, "items-added", actor, undefined, { added });
      return { added };
    }),
  );
}

/** PATCH {itemId, decision} → candidate|approved|rejected */
export async function PATCH(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  return NextResponse.json(
    await mutate((s) => {
      const item = s.collectionItems.find((i) => i.id === b.itemId);
      if (!item) throw new Error("item not found");
      item.decision = b.decision;
      audit(s, "collection_item", item.id, b.decision, actor);
      return item;
    }),
  );
}
