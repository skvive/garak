import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function studioActor() {
  const session = await requireAdmin();
  return session?.user?.email ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function bad(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}
