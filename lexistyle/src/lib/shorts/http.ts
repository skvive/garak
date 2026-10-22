import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireSession } from "@/lib/auth/admin";
import { ExtractError } from "./extract";
import { ShortsError } from "./service";

export const noStore = { "Cache-Control": "private, no-store" };

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noStore });

export async function sessionEmail(): Promise<string | null> {
  const s = await requireSession();
  return s?.user?.email?.toLowerCase() ?? null;
}

export function workerAuthorized(req: Request): boolean {
  const expected = process.env.SHORTS_WORKER_TOKEN?.trim();
  if (!expected) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function fail(e: unknown) {
  if (e instanceof ShortsError) return json({ error: e.message }, e.status);
  if (e instanceof ExtractError) return json({ error: e.message }, 422);
  console.error("[shorts]", e);
  return json({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
}
