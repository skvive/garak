import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { getHqOverview } from "@/lib/hq/overview";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const data = await getHqOverview();
  return NextResponse.json(data);
}
