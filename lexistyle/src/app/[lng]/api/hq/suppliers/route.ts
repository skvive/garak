import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { audit, getState, iso, mutate, nextId } from "@/lib/hq/store";
import { connectorCodes } from "@/lib/sourcing/registry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const s = await getState();
  return NextResponse.json({ suppliers: s.suppliers, connectorCodes });
}

export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const b = await req.json();
  if (!b.code || !b.name) return bad("code, name required");
  return NextResponse.json(
    await mutate((s) => {
      if (s.suppliers.some((x) => x.code === b.code)) throw new Error("duplicate code");
      const supplier = {
        id: nextId(s),
        code: String(b.code),
        name: String(b.name),
        homepage: b.homepage,
        connectorKind: b.connectorKind ?? "mock",
        currency: b.currency ?? "USD",
        leadTimeDays: b.leadTimeDays ?? 7,
        asCenterUrl: b.asCenterUrl,
        asPolicy: b.asPolicy,
        legalNote: b.legalNote,
        status: "active" as const,
        createdAt: iso(),
      };
      s.suppliers.push(supplier);
      audit(s, "supplier", supplier.id, "created", actor);
      return supplier;
    }),
  );
}
